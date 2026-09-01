export type DetectedCoordinates = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type GeolocationFailureCode =
  | "unsupported"
  | "insecure"
  | "permission"
  | "unavailable"
  | "timeout"
  | "invalid"
  | "unknown";

export class GeolocationFailure extends Error {
  constructor(
    public readonly code: GeolocationFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "GeolocationFailure";
  }
}

function isLocalhost() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function mapBrowserError(error: GeolocationPositionError): GeolocationFailure {
  if (error.code === 1) {
    return new GeolocationFailure(
      "permission",
      "Lokatsiyaga ruxsat berilmadi. Brauzer sozlamasidan Location ruxsatini yoqing.",
    );
  }
  if (error.code === 2) {
    return new GeolocationFailure(
      "unavailable",
      "Telefon joylashuvni aniqlay olmadi. GPS'ni yoqib, ochiqroq joyda qayta urining.",
    );
  }
  if (error.code === 3) {
    return new GeolocationFailure(
      "timeout",
      "Lokatsiyani aniqlash uzoq davom etdi. GPS'ni yoqib, qayta urining.",
    );
  }
  return new GeolocationFailure("unknown", "Lokatsiyani aniqlashda xatolik yuz berdi.");
}

function requestPosition(options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function normalizePosition(position: GeolocationPosition): DetectedCoordinates {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const accuracy = Math.max(0, Math.round(position.coords.accuracy || 0));

  if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new GeolocationFailure("invalid", "Qurilma noto'g'ri lokatsiya qaytardi. Qayta urining.");
  }

  return { lat, lng, accuracy };
}

export async function detectCurrentCoordinates(): Promise<DetectedCoordinates> {
  if (!window.isSecureContext && !isLocalhost()) {
    throw new GeolocationFailure(
      "insecure",
      "Lokatsiya faqat xavfsiz HTTPS manzilda ishlaydi.",
    );
  }
  if (!navigator.geolocation) {
    throw new GeolocationFailure(
      "unsupported",
      "Bu qurilma lokatsiyani aniqlashni qo'llab-quvvatlamaydi.",
    );
  }

  try {
    const position = await requestPosition({
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 0,
    });
    return normalizePosition(position);
  } catch (firstError) {
    const mapped = firstError instanceof GeolocationFailure
      ? firstError
      : mapBrowserError(firstError as GeolocationPositionError);

    if (mapped.code === "permission" || mapped.code === "insecure" || mapped.code === "unsupported") {
      throw mapped;
    }

    try {
      const fallbackPosition = await requestPosition({
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 60_000,
      });
      return normalizePosition(fallbackPosition);
    } catch (fallbackError) {
      if (fallbackError instanceof GeolocationFailure) throw fallbackError;
      throw mapBrowserError(fallbackError as GeolocationPositionError);
    }
  }
}
