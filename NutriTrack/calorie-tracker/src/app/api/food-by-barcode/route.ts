import { NextResponse } from "next/server";
import { normalize, type RawProduct } from "@/lib/openFoodFacts";

const FIELDS = [
  "code",
  "product_name",
  "product_name_sk",
  "product_name_en",
  "brands",
  "countries_tags",
  "image_thumb_url",
  "image_small_url",
  "nutriments",
].join(",");

const UA = "nutriTrack/0.1 (https://github.com/K3V1NUZ/nutritrack)";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") || "").trim();
  if (!/^[0-9]{6,14}$/.test(code)) {
    return NextResponse.json({ product: null }, { status: 400 });
  }

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=${FIELDS}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      return NextResponse.json({ product: null });
    }
    const json = (await res.json()) as {
      status?: number;
      product?: RawProduct;
    };
    if (json.status !== 1 || !json.product) {
      return NextResponse.json({ product: null });
    }
    const product = normalize(json.product);
    return NextResponse.json({ product });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Barcode lookup failed" },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
