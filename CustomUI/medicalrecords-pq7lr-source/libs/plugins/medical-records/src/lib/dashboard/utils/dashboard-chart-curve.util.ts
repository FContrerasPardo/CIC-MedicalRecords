export interface ChartCurvePoint {
    x: number;
    y: number;
}

/** Cardinal spline (Catmull-Rom) converted to cubic Bezier — passes through every point. */
export function buildSmoothLinePath(points: ChartCurvePoint[], tension = 1): string {
    if (!points.length) {
        return '';
    }

    if (points.length === 1) {
        return `M ${points[0].x} ${points[0].y}`;
    }

    if (points.length === 2) {
        return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let index = 0; index < points.length - 1; index += 1) {
        const previous = points[index === 0 ? 0 : index - 1];
        const current = points[index];
        const next = points[index + 1];
        const afterNext = points[index + 2] ?? next;

        const control1X = current.x + ((next.x - previous.x) / 6) * tension;
        const control1Y = current.y + ((next.y - previous.y) / 6) * tension;
        const control2X = next.x - ((afterNext.x - current.x) / 6) * tension;
        const control2Y = next.y - ((afterNext.y - current.y) / 6) * tension;

        path += ` C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${next.x} ${next.y}`;
    }

    return path;
}

export function buildSmoothAreaPath(points: ChartCurvePoint[], baselineY: number, tension = 1): string {
    if (!points.length) {
        return '';
    }

    const linePath = buildSmoothLinePath(points, tension);
    const first = points[0];
    const last = points[points.length - 1];

    return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}
