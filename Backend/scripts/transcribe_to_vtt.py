#!/usr/bin/env python3
import argparse
import os
import sys
import tempfile
import time
from datetime import datetime
from faster_whisper import WhisperModel
from google.cloud import storage

def log_with_timestamp(message, level="INFO"):
    """Log message with timestamp and level"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}")
    sys.stdout.flush()  # Ensure immediate output

def log_progress(current, total, task_name, start_time=None):
    """Log progress with percentage and ETA"""
    percentage = (current / total) * 100
    progress_bar = "█" * int(percentage // 5) + "░" * (20 - int(percentage // 5))
    
    eta_str = ""
    if start_time and current > 0:
        elapsed = time.time() - start_time
        rate = current / elapsed
        remaining = (total - current) / rate if rate > 0 else 0
        eta_str = f" | ETA: {int(remaining)}s"
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [PROGRESS] {task_name}: [{progress_bar}] {percentage:.1f}% ({current}/{total}){eta_str}")
    sys.stdout.flush()  # Force immediate output

def format_ts(t: float) -> str:
    try:
        t = float(t)
    except Exception:
        t = 0.0
    if t < 0:
        t = 0.0
    total_ms = int(round(t * 1000.0))
    h, rem = divmod(total_ms, 3600_000)
    m, rem = divmod(rem, 60_000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"

def write_vtt(segments, out_path: str):
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("WEBVTT\n\n")
        for i, seg in enumerate(segments, 1):
            start_ms = int(round(float(getattr(seg, "start", 0.0)) * 1000.0))
            end_ms = int(round(float(getattr(seg, "end", 0.0)) * 1000.0))
            start_ts = format_ts(start_ms / 1000.0)
            end_ts = format_ts(end_ms / 1000.0)
            text = getattr(seg, "text", "").strip()
            if text:
                f.write(f"{start_ts} --> {end_ts}\n{text}\n\n")

def upload_to_gcs(bucket_name: str, local_path: str, dest_path: str) -> str:
    """Upload file to GCS with proper service account credentials"""
    try:
        # Use explicit credentials path for SIH project
        credentials_path = "/Users/smitthakkar/Downloads/SIH/Backend/gcp-credentials.json"
        if os.path.exists(credentials_path):
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
            log_with_timestamp(f"Using SIH service account credentials: {credentials_path}", level="INFO")
        
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(dest_path)
        blob.upload_from_filename(local_path, content_type="text/vtt")
        blob.make_public()
        public_url = blob.public_url
        log_with_timestamp(f"✅ Uploaded to GCS: {public_url}", level="SUCCESS")
        return public_url
    except Exception as e:
        log_with_timestamp(f"❌ GCS upload failed: {str(e)}", level="ERROR")
        raise

def translate_to_hindi(text: str) -> str:
    # Fast word replacement for common terms
    key_translations = {
        "hello": "नमस्ते", "welcome": "स्वागत", "thank you": "धन्यवाद",
        "good": "अच्छा", "bad": "बुरा", "yes": "हाँ", "no": "नहीं",
        "water": "पानी", "food": "खाना", "house": "घर", "school": "स्कूल"
    }
    
    # Fast word replacement - only check if key terms exist
    result = text.lower()
    for eng, hindi in key_translations.items():
        if eng in result:
            result = result.replace(eng, hindi)
    
    return result

def translate_to_punjabi(text: str) -> str:
    """Enhanced Punjabi translation with comprehensive word mappings"""
    # Comprehensive word replacement for common educational terms
    key_translations = {
        # Basic greetings and responses
        "hello": "ਸਤ ਸ੍ਰੀ ਅਕਾਲ", "hi": "ਸਤ ਸ੍ਰੀ ਅਕਾਲ", "welcome": "ਜੀ ਆਇਆਂ ਨੂੰ", 
        "thank you": "ਧੰਨਵਾਦ", "thanks": "ਧੰਨਵਾਦ", "please": "ਕਿਰਪਾ ਕਰਕੇ",
        "yes": "ਹਾਂ", "no": "ਨਹੀਂ", "okay": "ਠੀਕ ਹੈ", "ok": "ਠੀਕ ਹੈ",
        
        # Educational terms
        "school": "ਸਕੂਲ", "student": "ਵਿਦਿਆਰਥੀ", "teacher": "ਅਧਿਆਪਕ", 
        "lesson": "ਪਾਠ", "chapter": "ਅਧਿਆਏ", "book": "ਕਿਤਾਬ",
        "learn": "ਸਿੱਖਣਾ", "study": "ਪੜ੍ਹਨਾ", "education": "ਸਿੱਖਿਆ",
        "knowledge": "ਗਿਆਨ", "understand": "ਸਮਝਣਾ", "explain": "ਸਮਝਾਉਣਾ",
        
        # Basic adjectives
        "good": "ਚੰਗਾ", "bad": "ਮਾੜਾ", "big": "ਵੱਡਾ", "small": "ਛੋਟਾ",
        "easy": "ਆਸਾਨ", "difficult": "ਮੁਸ਼ਕਿਲ", "important": "ਮਹੱਤਵਪੂਰਨ",
        "new": "ਨਵਾਂ", "old": "ਪੁਰਾਣਾ", "right": "ਸਹੀ", "wrong": "ਗਲਤ",
        
        # Common nouns
        "water": "ਪਾਣੀ", "food": "ਖਾਣਾ", "house": "ਘਰ", "home": "ਘਰ",
        "family": "ਪਰਿਵਾਰ", "friend": "ਦੋਸਤ", "time": "ਸਮਾਂ", "day": "ਦਿਨ",
        "work": "ਕੰਮ", "money": "ਪੈਸਾ", "people": "ਲੋਕ", "person": "ਵਿਅਕਤੀ",
        
        # Numbers (basic)
        "one": "ਇੱਕ", "two": "ਦੋ", "three": "ਤਿੰਨ", "four": "ਚਾਰ", "five": "ਪੰਜ",
        "first": "ਪਹਿਲਾ", "second": "ਦੂਜਾ", "third": "ਤੀਜਾ",
        
        # Action words
        "go": "ਜਾਣਾ", "come": "ਆਉਣਾ", "see": "ਦੇਖਣਾ", "hear": "ਸੁਣਨਾ",
        "speak": "ਬੋਲਣਾ", "read": "ਪੜ੍ਹਨਾ", "write": "ਲਿਖਣਾ", "think": "ਸੋਚਣਾ",
        
        # Question words
        "what": "ਕੀ", "where": "ਕਿੱਥੇ", "when": "ਕਦੋਂ", "why": "ਕਿਉਂ", 
        "how": "ਕਿਵੇਂ", "who": "ਕੌਣ", "which": "ਕਿਹੜਾ",
        
        # Common phrases
        "let's start": "ਚਲੋ ਸ਼ੁਰੂ ਕਰਦੇ ਹਾਂ", "very good": "ਬਹੁਤ ਵਧੀਆ",
        "well done": "ਸ਼ਾਬਾਸ਼", "try again": "ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ",
        "pay attention": "ਧਿਆਨ ਦਿਓ", "listen carefully": "ਧਿਆਨ ਨਾਲ ਸੁਣੋ"
    }
    
    # Convert to lowercase for matching but preserve original case structure
    result = text
    text_lower = text.lower()
    
    # Sort by length (longest first) to avoid partial replacements
    sorted_translations = sorted(key_translations.items(), key=lambda x: len(x[0]), reverse=True)
    
    for eng, punjabi in sorted_translations:
        if eng in text_lower:
            # Case-insensitive replacement while preserving structure
            import re
            pattern = re.compile(re.escape(eng), re.IGNORECASE)
            result = pattern.sub(punjabi, result)
    
    return result

def main():
    p = argparse.ArgumentParser(description="Transcribe audio/video to multi-language WebVTT and upload to GCS")
    p.add_argument("--input", required=True, help="Input path or URL (mp4, mp3, wav, or HLS master.m3u8)")
    p.add_argument("--bucket", required=True, help="GCS bucket name (public bucket for playback)")
    p.add_argument("--admin-id", required=True)
    p.add_argument("--course-id", required=True)
    p.add_argument("--asset-id", required=True)
    p.add_argument("--lang", default="en", help="Primary transcription language (forced to English)")
    p.add_argument("--model", default="base", help="faster-whisper model size: tiny/base/small/medium/large-v3")
    p.add_argument("--compute-type", default="int8", help="CPU: int8 or int8_float16; fallback: float32")
    p.add_argument("--generate-all-langs", action="store_true", help="Generate captions for English, Hindi, and Punjabi")
    args = p.parse_args()

    log_with_timestamp("Starting transcription process...", level="INFO")
    
    # Define overall progress phases
    total_phases = 4
    current_phase = 0
    temp_video_file = None
    
    def update_overall_progress(phase_name, phase_num):
        nonlocal current_phase
        current_phase = phase_num
        percentage = (current_phase / total_phases) * 100
        progress_bar = "█" * int(percentage // 5) + "░" * (20 - int(percentage // 5))
        log_with_timestamp(f"OVERALL PROGRESS: [{progress_bar}] {percentage:.0f}% - {phase_name}", level="PROGRESS")

    try:
        # Phase 1: Model Loading
        update_overall_progress("Loading Whisper Model", 1)
        log_with_timestamp(f"Loading model '{args.model}' with compute_type '{args.compute_type}'...", level="INFO")
        model = WhisperModel(
            args.model, 
            device="cpu", 
            compute_type=args.compute_type,
            download_root=os.path.expanduser("~/.cache/huggingface/hub")
        )
        log_with_timestamp("✅ Model loaded successfully", level="SUCCESS")

        # Handle HLS URLs by finding the original source video file using GCS API
        input_source = args.input
        
        if args.input.endswith('master.m3u8') or 'master.m3u8' in args.input:
            log_with_timestamp("HLS URL detected, searching for source video file using GCS API...", level="INFO")
            
            # Extract bucket and path from URL
            # URL format: https://bucket-name.storage.googleapis.com/path/to/asset/master.m3u8
            url_parts = args.input.replace('https://', '').split('/')
            bucket_name = url_parts[0].split('.')[0]  # Extract bucket name
            asset_path = '/'.join(url_parts[1:-1])  # Remove master.m3u8 from path
            
            try:
                from google.cloud import storage
                from google.oauth2 import service_account
                
                # Load credentials
                credentials_path = "/Users/smitthakkar/Downloads/SIH/Backend/gcp-credentials.json"
                credentials = service_account.Credentials.from_service_account_file(credentials_path)
                client = storage.Client(credentials=credentials, project="dev-airlock-471717-b0")
                bucket = client.bucket(bucket_name)
                
                # List all files in the asset directory
                blobs = list(bucket.list_blobs(prefix=asset_path))
                
                # Look for video files in order of preference
                video_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
                preferred_names = ['source', 'original', 'input', 'video']
                
                found_video = None
                
                # First, try to find preferred named files
                for name in preferred_names:
                    for ext in video_extensions:
                        target_name = f"{asset_path}/{name}{ext}"
                        for blob in blobs:
                            if blob.name == target_name:
                                found_video = f"https://{bucket_name}.storage.googleapis.com/{blob.name}"
                                log_with_timestamp(f"Found preferred source video: {blob.name}", level="SUCCESS")
                                break
                        if found_video:
                            break
                    if found_video:
                        break
                
                # If no preferred file found, look for any video file
                if not found_video:
                    for blob in blobs:
                        if any(blob.name.lower().endswith(ext) for ext in video_extensions):
                            # Skip HLS segments and small files
                            if not any(segment in blob.name for segment in ['/480/', '/720/', '/1080/', 'segment', '.ts']):
                                if blob.size and blob.size > 1024 * 1024:  # At least 1MB
                                    found_video = f"https://{bucket_name}.storage.googleapis.com/{blob.name}"
                                    log_with_timestamp(f"Found video file: {blob.name} ({blob.size / (1024*1024):.1f}MB)", level="SUCCESS")
                                    break
                
                if found_video:
                    input_source = found_video
                else:
                    log_with_timestamp("No suitable video file found in GCS bucket", level="WARNING")
                    # Try to use the highest quality HLS stream instead
                    hls_variants = ['1080', '720', '480']
                    for variant in hls_variants:
                        variant_url = args.input.replace('master.m3u8', f'{variant}/index.m3u8')
                        try:
                            import requests
                            response = requests.head(variant_url, timeout=5)
                            if response.status_code == 200:
                                input_source = variant_url
                                log_with_timestamp(f"Using HLS variant: {variant}p", level="INFO")
                                break
                        except:
                            continue
                    
                    if input_source == args.input:
                        log_with_timestamp("No working HLS variants found, will try original URL", level="WARNING")
                        
            except Exception as e:
                log_with_timestamp(f"Error accessing GCS bucket: {e}", level="ERROR")
                log_with_timestamp("Falling back to original HLS URL", level="WARNING")

        # Phase 2: Transcription
        update_overall_progress("Transcribing Audio", 2)
        log_with_timestamp(f"Transcribing '{input_source}' in language '{args.lang}'...", level="INFO")
        args.lang = "en"  # Force English transcription regardless of input
        # Create a custom progress callback for transcription
        transcription_start_time = time.time()
        segments_processed = 0
        last_progress_time = time.time()
        
        segments_iter, info = model.transcribe(
            input_source,
            language=args.lang,
            vad_filter=True,  # helps with noisy audio
            beam_size=1,  # Faster processing
            best_of=1,  # Faster processing
            temperature=0.0,  # Deterministic
            condition_on_previous_text=False  # Faster
        )
        
        # Get audio duration info if available
        audio_duration = getattr(info, 'duration', None)
        if audio_duration:
            log_with_timestamp(f"Audio duration: {audio_duration:.1f} seconds", level="INFO")
        
        # Process segments with real-time progress tracking
        segments = []
        log_with_timestamp("Processing transcription segments...", level="INFO")
        
        # Start a background thread to show periodic progress
        import threading
        progress_stop_event = threading.Event()
        
        def periodic_progress_update():
            while not progress_stop_event.is_set():
                time.sleep(10)  # Update every 10 seconds
                if not progress_stop_event.is_set() and segments:
                    latest_segment = segments[-1]
                    current_time = latest_segment.end
                    elapsed = time.time() - transcription_start_time
                    
                    if audio_duration and audio_duration > 0:
                        progress_percentage = (current_time / audio_duration) * 100
                        processing_rate = current_time / elapsed if elapsed > 0 else 0
                        eta_seconds = (audio_duration - current_time) / processing_rate if processing_rate > 0 else 0
                        
                        log_with_timestamp(
                            f"🎵 Transcribing... {current_time:.1f}s/{audio_duration:.1f}s ({progress_percentage:.1f}%) "
                            f"| Rate: {processing_rate:.1f}x | ETA: {eta_seconds:.0f}s",
                            level="PROGRESS"
                        )
                    else:
                        log_with_timestamp(
                            f"🎵 Transcribing... {len(segments)} segments processed | Latest: {current_time:.1f}s",
                            level="PROGRESS"
                        )
        
        # Start progress thread
        progress_thread = threading.Thread(target=periodic_progress_update, daemon=True)
        progress_thread.start()
        
        try:
            # Process all segments
            for segment in segments_iter:
                segments.append(segment)
                segments_processed += 1
                
                # Show progress every 50 segments or every 30 seconds
                current_time = time.time()
                if segments_processed % 50 == 0 or (current_time - last_progress_time) > 30:
                    if audio_duration and audio_duration > 0:
                        progress_percentage = (segment.end / audio_duration) * 100
                        elapsed = current_time - transcription_start_time
                        processing_rate = segment.end / elapsed if elapsed > 0 else 0
                        
                        log_with_timestamp(
                            f"🎵 Processing segment {segments_processed}: {segment.end:.1f}s ({progress_percentage:.1f}%) "
                            f"| Rate: {processing_rate:.1f}x",
                            level="PROGRESS"
                        )
                    else:
                        log_with_timestamp(
                            f"🎵 Processing segment {segments_processed}: {segment.end:.1f}s",
                            level="PROGRESS"
                        )
                    last_progress_time = current_time
            
            # Stop progress thread
            progress_stop_event.set()
            
            log_with_timestamp(f"✅ Transcription complete. Found {len(segments)} segments.", level="SUCCESS")
            
        except Exception as transcription_error:
            # Stop progress thread
            progress_stop_event.set()
            
            log_with_timestamp(f"⚠️ Transcription failed: {str(transcription_error)}", level="WARNING")
            log_with_timestamp("Attempting fallback transcription with reduced settings...", level="INFO")
            
            update_overall_progress("Transcribing with Fallback", 2)
            segments_iter, info = model.transcribe(
                input_source,
                language=args.lang,
                vad_filter=True,
                beam_size=1,  # Smaller beam for faster processing
                best_of=1,  # Faster processing
                temperature=0.0,  # Deterministic
                condition_on_previous_text=False  # Faster
            )
            segments = list(segments_iter)
            log_with_timestamp(f"Fallback transcription complete. Found {len(segments)} segments.", level="SUCCESS")

        if not segments:
            log_with_timestamp("❌ No segments found in transcription", level="ERROR")
            sys.exit(1)

        # Phase 3: Generate multi-language captions
        update_overall_progress("Generating Multi-language Captions", 3)
        
        languages_to_generate = ["en"]  # Force English only
# Removed multi-language generation - English only
        
        with tempfile.TemporaryDirectory() as td:
            caption_files = {}
            
            for lang_code in languages_to_generate:
                log_with_timestamp(f"Generating {lang_code} captions...", level="INFO")
                
                if lang_code == "en":
                    # Use original English segments
                    lang_segments = segments
                elif lang_code == "hi":
                    # Translate to Hindi
                    lang_segments = []
                    for seg in segments:
                        translated_text = translate_to_hindi(seg.text)
                        # Create a new segment-like object
                        class TranslatedSegment:
                            def __init__(self, start, end, text):
                                self.start = start
                                self.end = end
                                self.text = text
                        lang_segments.append(TranslatedSegment(seg.start, seg.end, translated_text))
                elif lang_code == "pa":
                    # Translate to Punjabi
                    lang_segments = []
                    for seg in segments:
                        translated_text = translate_to_punjabi(seg.text)
                        # Create a new segment-like object
                        class TranslatedSegment:
                            def __init__(self, start, end, text):
                                self.start = start
                                self.end = end
                                self.text = text
                        lang_segments.append(TranslatedSegment(seg.start, seg.end, translated_text))
                
                # Write VTT file
                vtt_local = os.path.join(td, f"captions_{lang_code}.vtt")
                write_vtt(lang_segments, vtt_local)
                caption_files[lang_code] = vtt_local
                
                log_with_timestamp(f"✅ {lang_code} captions generated: {len(lang_segments)} segments", level="SUCCESS")

            # Phase 4: Upload to GCS
            update_overall_progress("Uploading Captions", 4)
            
            uploaded_urls = []
            for lang_code, vtt_local in caption_files.items():
                dest_path = f"assets/{args.admin_id}/{args.course_id}/{args.asset_id}/captions_{lang_code}.vtt"
                public_url = upload_to_gcs(args.bucket, vtt_local, dest_path)
                uploaded_urls.append(public_url)
                log_with_timestamp(f"✅ {lang_code} captions uploaded: {public_url}", level="SUCCESS")

        primary_url = uploaded_urls[0] if uploaded_urls else ""
        log_with_timestamp(f"Caption generation process completed. Primary URL: {primary_url}", level="SUCCESS")
        print(primary_url)

        log_with_timestamp("🎉 Caption generation completed successfully!", level="SUCCESS")
        
    except Exception as e:
        log_with_timestamp(f"❌ Error during transcription: {str(e)}", level="ERROR")
        sys.exit(1)
    
    finally:
        # Clean up temporary video file if created
        if temp_video_file and os.path.exists(temp_video_file.name):
            try:
                os.unlink(temp_video_file.name)
                log_with_timestamp("Cleaned up temporary video file", level="INFO")
            except Exception as e:
                log_with_timestamp(f"Failed to clean up temp file: {e}", level="WARNING")

if __name__ == "__main__":
    main()
