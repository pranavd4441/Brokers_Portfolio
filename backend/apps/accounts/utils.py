def parse_user_agent(user_agent_str):
    """
    Parses user agent to extract browser and OS details.
    """
    if not user_agent_str:
        return "Unknown", "Unknown"

    ua = user_agent_str.lower()

    # Simple OS detection
    if "windows" in ua:
        os_name = "Windows"
    elif "macintosh" in ua or "mac os x" in ua:
        os_name = "macOS"
    elif "linux" in ua:
        os_name = "Linux"
    elif "android" in ua:
        os_name = "Android"
    elif "iphone" in ua or "ipad" in ua:
        os_name = "iOS"
    else:
        os_name = "Unknown OS"

    # Simple Browser detection
    if "chrome" in ua or "chromium" in ua:
        if "edg" in ua:
            browser_name = "Edge"
        elif "opr" in ua or "opera" in ua:
            browser_name = "Opera"
        else:
            browser_name = "Chrome"
    elif "safari" in ua:
        browser_name = "Safari"
    elif "firefox" in ua:
        browser_name = "Firefox"
    elif "msie" in ua or "trident" in ua:
        browser_name = "Internet Explorer"
    else:
        browser_name = "Unknown Browser"

    return browser_name, os_name


def get_client_ip(request):
    """
    Extracts the client's public IP address safely from headers.
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip


def get_client_city(request):
    """
    Extracts the client's city from standard proxy geo headers (Render, CF).
    """
    city = request.headers.get("CF-IPCity") or request.META.get("HTTP_CF_IPCITY")
    if not city:
        city = request.headers.get("X-AppEngine-City") or request.META.get(
            "HTTP_X_APPENGINE_CITY"
        )
    if not city:
        city = request.headers.get("X-Render-Geo-City") or request.META.get(
            "HTTP_X_RENDER_GEO_CITY"
        )
    return city or "Unknown"


def get_frontend_url(request=None):
    """
    Resolves the frontend landing page URL.
    - Local: maps localhost:8000 to localhost:3000
    - Production (Render): maps property-os-backend to property-os-frontend
    """
    import os

    env_site_url = os.getenv("NEXT_PUBLIC_SITE_URL")
    if env_site_url and env_site_url != "http://localhost":
        return env_site_url.rstrip("/")

    if request:
        url = request.build_absolute_uri("/")[:-1]
    else:
        url = os.getenv("NEXT_PUBLIC_SITE_URL", "http://localhost").rstrip("/")

    if "localhost" in url or "127.0.0.1" in url:
        return url.replace(":8000", ":3000")
    if "-backend" in url:
        return url.replace("-backend", "-frontend")
    return url
