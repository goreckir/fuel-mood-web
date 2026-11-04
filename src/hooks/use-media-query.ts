import { useEffect, useState } from "react";

/**
 * Phones and small tablets, in either orientation: the compact layout (one-row header, sheets instead of
 * floating panels). A landscape phone is wide but short, so height counts too.
 */
export const COMPACT = "(max-width: 1023px), (max-height: 560px)";
/** Landscape phone: sheets open from the side instead of the bottom. */
export const SHORT_LANDSCAPE = "(orientation: landscape) and (max-height: 560px)";
/** Real pointer hover (mouse, trackpad); touch screens fake hover on tap. */
export const CAN_HOVER = "(hover: hover)";

export function matches(query: string) {
    return typeof window !== "undefined" && window.matchMedia(query).matches;
}

export function useMediaQuery(query: string) {
    const [value, setValue] = useState(() => matches(query));
    useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = () => setValue(mql.matches);
        onChange();
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, [query]);
    return value;
}
