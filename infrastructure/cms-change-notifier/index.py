from app import http_handler, stream_handler


def handler(event, context):
    if event.get("Records"):
        return stream_handler(event, context)
    return http_handler(event, context)


__all__ = ["handler"]
