from django.http import JsonResponse


async def healthz(request):
    """Liveness only: the process is up and routing. Readiness checks come with the stack."""
    return JsonResponse({"status": "ok"})
