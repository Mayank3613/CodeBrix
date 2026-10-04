import sys
import json
from datetime import datetime, timezone

def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()

def emit_json(obj: dict):
    """Emit a single-line JSON string followed by newline and flush immediately."""
    print(json.dumps(obj), flush=True)

def main():
    # 1. Emit runtime status
    emit_json({
        "event": "status",
        "payload": "running",
        "timestamp": iso_now()
    })

    # 2. Emit hello world console message
    emit_json({
        "type": "console",
        "stream": "stdout",
        "text": "Hello from CodeBrix Python Runtime Spike!",
        "timestamp": iso_now()
    })

    # 3. Emit structured metrics / data payload
    emit_json({
        "type": "metrics",
        "title": "Phase 0 Spike Verification",
        "metrics": {
            "spike_status": "pass",
            "protocol_version": "0.1.0",
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        },
        "timestamp": iso_now()
    })

    # 4. Read stdin only if --stdin flag is explicitly passed
    if "--stdin" in sys.argv and not sys.stdin.isatty():
        try:
            line = sys.stdin.readline()
            if line:
                emit_json({
                    "type": "console",
                    "stream": "stdout",
                    "text": f"Echo from stdin: {line.strip()}",
                    "timestamp": iso_now()
                })
        except Exception:
            pass

    # 5. Emit completion event
    emit_json({
        "event": "done",
        "payload": {
            "exitCode": 0,
            "status": "success"
        },
        "timestamp": iso_now()
    })

if __name__ == "__main__":
    main()
