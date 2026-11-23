import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ImageIcon, MapPin, Monitor, RectangleHorizontal, RectangleVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  availabilityLabel, fmtDistance, fmtPrice, orientation, sizeInches, spaceSubtitle,
  type Space, type SpaceExtras,
} from "./browseData";
import { Skeleton } from "./primitives";

/**
 * A space in the results, from the "Browse spaces" design: photo carousel with an availability
 * badge, the day price, screen facts and the name. The whole card links to the space.
 */
export function ListingCard({
  space,
  extras,
  href,
  range,
  highlighted,
  compactMedia,
  onHover,
}: {
  space: Space;
  extras: SpaceExtras | undefined;
  href: string;
  range: { from: Date; to: Date } | null;
  highlighted?: boolean;
  /** Fixed 200px photo for the phone list. */
  compactMedia?: boolean;
  onHover?: (hovered: boolean) => void;
}) {
  const [photo, setPhoto] = useState(0);
  const images = extras?.images ?? [];
  const many = images.length > 1;
  const inch = sizeInches(space);
  const orient = orientation(space);
  const avail = extras ? availabilityLabel(extras.days, range) : null;

  const step = (e: React.MouseEvent, by: number) => {
    e.preventDefault();
    e.stopPropagation();
    setPhoto(p => (p + by + images.length) % images.length);
  };

  return (
    <Link
      to={href}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      className={cn(
        "group/card flex min-w-0 flex-col gap-3 rounded-lg text-[#1a1d25] no-underline",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3a47c2]",
      )}
      data-hover={highlighted || undefined}>
      <div
        className={cn(
          "relative grid place-items-center overflow-hidden rounded-xl bg-[#f1f2f7] text-[#8f929d]",
          compactMedia ? "h-[200px]" : "aspect-[4/3]",
        )}>
        {images.length > 0 ? (
          <img src={images[photo]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <ImageIcon aria-hidden className="h-6 w-6" />
        )}
        {many && (
          <>
            {[-1, 1].map(by => (
              <button
                key={by}
                type="button"
                aria-label={by < 0 ? "Previous photo" : "Next photo"}
                onClick={e => step(e, by)}
                className={cn(
                  "absolute top-[calc(50%-16px)] z-[1] grid h-8 w-8 place-items-center rounded-full bg-white text-[#1a1d25] shadow-[0_1px_3px_rgba(26,29,37,0.16)] transition-opacity",
                  "opacity-0 focus-visible:opacity-100 group-hover/card:opacity-100 group-data-[hover]/card:opacity-100",
                  by < 0 ? "left-2" : "right-2",
                )}>
                {by < 0 ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ))}
            <span aria-hidden className="absolute bottom-2 left-1/2 z-[1] flex -translate-x-1/2 gap-1">
              {images.slice(0, 6).map((_, i) => (
                <i key={i} className={cn("h-2 w-2 rounded-full bg-white", i === photo % 6 ? "opacity-100" : "opacity-60")} />
              ))}
            </span>
          </>
        )}
        {avail && (
          <span
            className={cn(
              "absolute left-3 top-3 z-[1] inline-flex h-7 items-center rounded-lg bg-white px-2 text-xs font-medium leading-4 shadow-[0_1px_3px_rgba(26,29,37,0.16)]",
              avail.full ? "text-[#016d36]" : "text-[#4a4d56]",
            )}>
            {avail.text}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {extras === undefined ? (
          <Skeleton className="h-7 w-2/5" />
        ) : (
          <span className="text-sm leading-5 text-[#4a4d56]">
            {extras.fromPrice != null ? (
              <>From <b className="text-xl font-semibold leading-7 tabular-nums text-[#1a1d25]">{fmtPrice(extras.fromPrice)}</b> a day</>
            ) : (
              <span className="text-[#656972]">No time slots yet</span>
            )}
          </span>
        )}
        {(inch != null || orient || space.distance_km != null) && (
          <div className="flex flex-wrap gap-4 text-sm leading-5 text-[#4a4d56] [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-[#656972]">
            {inch != null && <span className="inline-flex items-center gap-1"><Monitor aria-hidden />{inch} in</span>}
            {orient && (
              <span className="inline-flex items-center gap-1">
                {orient === "landscape" ? <RectangleHorizontal aria-hidden /> : <RectangleVertical aria-hidden />}
                {orient === "landscape" ? "Landscape" : "Portrait"}
              </span>
            )}
            {space.distance_km != null && (
              <span className="inline-flex items-center gap-1"><MapPin aria-hidden />{fmtDistance(space.distance_km)}</span>
            )}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <span className="line-clamp-2 text-base font-semibold leading-6 text-[#1a1d25]">{space.name}</span>
          <span className="text-sm leading-5 text-[#656972]">{spaceSubtitle(space)}</span>
        </div>
      </div>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="aspect-[4/3] w-full rounded-xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-[45%]" />
        <Skeleton className="h-5 w-[65%]" />
        <Skeleton className="h-6 w-[55%]" />
        <Skeleton className="h-5 w-[75%]" />
      </div>
    </div>
  );
}
