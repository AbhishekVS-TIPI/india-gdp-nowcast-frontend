import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TOOLTIP_STYLE, axisTick, useRootScale } from "@/lib/chart";
import { BREADTH, fmtMonth } from "@/lib/signals";

/** Share of growth indicators pointing to stronger-than-usual growth, month by month. */
export function Breadth() {
  const k = useRootScale();
  const data = BREADTH.map((p) => ({ label: fmtMonth(p.month), share: Math.round(p.share * 100) }));
  return (
    <div>
      <div className="h-[13.75rem] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, left: Math.round(-4 * k), bottom: 0 }}
          >
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={axisTick(10)}
              axisLine={false}
              tickLine={false}
              tickMargin={Math.round(6 * k)}
              minTickGap={40}
            />
            <YAxis
              width={Math.round(44 * k)}
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={axisTick()}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine y={50} stroke="var(--color-muted-foreground)" strokeDasharray="4 3" />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v) => [`${v}%`, "Pointing to stronger growth"]}
            />
            <Line
              dataKey="share"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-[0.6875rem] leading-relaxed text-muted-foreground">
        Above the dashed 50% line, more indicators are running stronger than usual than weaker.
        Prices are left out, and so are months where fewer than half the indicators have reported.
      </p>
    </div>
  );
}
