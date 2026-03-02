export type ReverseGeocodeResult = {
  addressFull: string;
  city?: string;
  district?: string;
  postalCode?: string;
  isApproximate?: boolean;
};

function pickFirst<T>(arr: T[] | undefined | null): T | undefined {
  return Array.isArray(arr) && arr.length ? arr[0] : undefined;
}

export async function reverseGeocodeNominatim(args: {
  lat: number;
  lng: number;
}): Promise<ReverseGeocodeResult> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(args.lat));
  url.searchParams.set("lon", String(args.lng));
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      // Nominatim pede identificação do app. Em browser isso é o melhor que dá pra fazer.
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Reverse geocode falhou (HTTP ${res.status})`);
  }

  const data: any = await res.json();

  const displayName: string | undefined = data?.display_name;
  const addr = data?.address ?? {};

  const city =
    addr.city ??
    addr.town ??
    addr.village ??
    addr.municipality ??
    addr.county ??
    undefined;

  const district =
    addr.suburb ??
    addr.neighbourhood ??
    addr.city_district ??
    addr.district ??
    addr.quarter ??
    undefined;

  const postalCode: string | undefined = addr.postcode ?? undefined;

  const addressFull =
    displayName ||
    [
      pickFirst([addr.road, addr.pedestrian, addr.footway].filter(Boolean)),
      addr.house_number,
      district,
      city,
      addr.state,
      postalCode,
      addr.country,
    ]
      .filter(Boolean)
      .join(", ");

  return {
    addressFull,
    city,
    district,
    postalCode,
  };
}
