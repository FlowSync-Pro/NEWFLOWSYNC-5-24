import {
  BRAND_IMAGE_ALT,
  BRAND_IMAGE_CONTENT_TYPE,
  BRAND_IMAGE_SIZE,
  renderBrandImage,
} from "@/lib/brandImage";

export const alt = BRAND_IMAGE_ALT;
export const size = BRAND_IMAGE_SIZE;
export const contentType = BRAND_IMAGE_CONTENT_TYPE;

export default function Image() {
  return renderBrandImage();
}
