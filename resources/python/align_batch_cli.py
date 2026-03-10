#!/usr/bin/env python3

import argparse
import json
import sys
import time
from pathlib import Path

from munajjam.core import align
from munajjam.data import load_surah_ayahs
from munajjam.transcription import WhisperTranscriber

ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".flac"}
EXTENSION_PRIORITY = [".mp3", ".m4a", ".wav", ".flac"]
EXTENSION_RANK = {extension: index for index, extension in enumerate(EXTENSION_PRIORITY)}


def emit(event_type: str, **payload: object) -> None:
    message = {"type": event_type, **payload}
    print(json.dumps(message, ensure_ascii=False), flush=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Munajjam desktop batch adapter")
    parser.add_argument("--audio-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--reciter-name", required=False)
    parser.add_argument("--surah-ids", required=False, default="")
    return parser.parse_args()


def scan_audio_files(audio_dir: Path, surah_ids: set[int] | None) -> list[tuple[int, Path]]:
    by_surah: dict[int, Path] = {}

    for path in sorted(audio_dir.iterdir()):
        if not path.is_file():
            continue

        ext = path.suffix.lower()
        if ext not in ALLOWED_AUDIO_EXTENSIONS:
            continue

        stem = path.stem
        if not stem.isdigit():
            continue

        surah_id = int(stem)
        if surah_id < 1 or surah_id > 114:
            continue
        if surah_ids is not None and surah_id not in surah_ids:
            continue

        existing = by_surah.get(surah_id)
        if existing is None:
            by_surah[surah_id] = path
            continue

        current_rank = EXTENSION_RANK.get(existing.suffix.lower(), sys.maxsize)
        next_rank = EXTENSION_RANK.get(ext, sys.maxsize)
        if next_rank < current_rank:
            by_surah[surah_id] = path

    return sorted(by_surah.items(), key=lambda item: item[0])


def write_output(output_dir: Path, surah_id: int, results: list) -> None:
    payload = {
        "surah_id": surah_id,
        "ayahs": [
            {
                "ayah_number": result.ayah.ayah_number,
                "start": result.start_time,
                "end": result.end_time,
                "similarity": result.similarity_score,
            }
            for result in results
        ],
    }

    target = output_dir / f"{surah_id:03d}.json"
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    args = parse_args()
    audio_dir = Path(args.audio_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not audio_dir.is_dir():
        emit("error", message=f"Audio directory not found: {audio_dir}")
        return 1

    surah_ids = {
        int(value)
        for value in args.surah_ids.split(",")
        if value.strip().isdigit() and 1 <= int(value.strip()) <= 114
    }
    selected_surahs = surah_ids if surah_ids else None
    audio_files = scan_audio_files(audio_dir, selected_surahs)

    if not audio_files:
        emit("error", message=f"No supported audio files found in {audio_dir}")
        return 1

    emit("log", message=f"Found {len(audio_files)} audio files to process")

    errors = 0
    total = len(audio_files)

    with WhisperTranscriber() as transcriber:
        for index, (surah_id, audio_path) in enumerate(audio_files, start=1):
            emit(
                "surah_start",
                surah_id=surah_id,
                total=total,
                message=f"Processing surah {surah_id} ({index}/{total})",
            )

            started = time.perf_counter()
            try:
                emit(
                    "progress",
                    surah_id=surah_id,
                    stage="transcribing",
                    current=index,
                    total=total,
                    percent=((index - 1) / total) * 100,
                )
                segments = transcriber.transcribe(str(audio_path))
                ayahs = load_surah_ayahs(surah_id)
                emit(
                    "progress",
                    surah_id=surah_id,
                    stage="aligning",
                    current=index,
                    total=total,
                    percent=((index - 0.5) / total) * 100,
                )
                results = align(str(audio_path), segments, ayahs)
                write_output(output_dir, surah_id, results)

                elapsed = time.perf_counter() - started
                similarities = [result.similarity_score for result in results if result.similarity_score is not None]
                avg_similarity = sum(similarities) / len(similarities) if similarities else None

                emit(
                    "surah_done",
                    surah_id=surah_id,
                    aligned=len(results),
                    total=len(ayahs),
                    avg_similarity=avg_similarity,
                    similarity=avg_similarity,
                    seconds=elapsed,
                    message=f"Finished surah {surah_id}",
                )
            except Exception as error:
                errors += 1
                emit("surah_error", surah_id=surah_id, message=str(error))

    emit("log", message=f"Batch complete: {total - errors}/{total} succeeded")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
