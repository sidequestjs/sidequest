export type MongoCoalesce = string | { $ifNull: [string, MongoCoalesce] };

/**
 * Generates a MongoDB coalesce expression ($ifNull) that returns the first non-null value
 * from the provided columns, in order of priority.
 *
 * Example:
 *   coalesce('completed_at', 'failed_at', 'inserted_at')
 *   // => { $ifNull: [ "$completed_at", { $ifNull: [ "$failed_at", "$inserted_at" ] } ] }
 *
 * @param columns - List of column names to evaluate in order of priority.
 * @returns A MongoDB expression representing the coalesce logic.
 * @throws If no columns are provided.
 */
export function coalesce(...columns: string[]): MongoCoalesce {
  if (columns.length === 0) throw new Error("At least one column is required.");

  const buildCoalesce = (fields: string[]): MongoCoalesce =>
    fields.length === 1
      ? `$${fields[0]}`
      : {
          $ifNull: [`$${fields[0]}`, buildCoalesce(fields.slice(1))],
        };

  return buildCoalesce(columns);
}

/**
 * Generates a MongoDB aggregation stage ($addFields) that adds a field with the given name,
 * setting its value to the first non-null value found among the provided columns.
 *
 * Example:
 *   addCoalescedField('timestamp', 'completed_at', 'failed_at', 'inserted_at')
 *   // => { $addFields: { timestamp: { $ifNull: [ "$completed_at", { $ifNull: [ "$failed_at", "$inserted_at" ] } ] } } }
 *
 * @param fieldName - The name of the new field to add.
 * @param columns - List of column names to evaluate in order of priority.
 * @returns An object to be used as a stage in a MongoDB aggregation pipeline.
 * @throws If no columns are provided.
 */
export function addCoalescedField(fieldName: string, ...columns: string[]) {
  if (!fieldName) throw new Error("Field name is required.");
  if (columns.length === 0) throw new Error("At least one column is required.");

  return {
    $addFields: {
      [fieldName]: coalesce(...columns),
    },
  };
}

/**
 * Generates a MongoDB $match stage to filter documents by a date range on a given field.
 *
 * Example:
 *   matchDateRange('timestamp', { from: startDate, to: endDate })
 *   // => { $match: { timestamp: { $gte: startDate, $lte: endDate } } }
 *
 * @param field - The field to filter by.
 * @param range - An object containing optional "from" and "to" Date values.
 * @returns A $match stage object or undefined if no range is provided.
 */
export function matchDateRange(field: string, range?: { from?: Date; to?: Date }) {
  if (!range?.from && !range?.to) return undefined;
  const match: Record<string, Date> = {};
  if (range.from) match.$gte = range.from;
  if (range.to) match.$lte = range.to;
  return { $match: { [field]: match } };
}

/**
 * Parses a time range string like "12m", "5h", or "3d" and returns its numeric value and unit.
 *
 * Example:
 *   parseTimeRange("12h") // => { amount: 12, unit: "h" }
 *
 * @param str - The time range string (e.g., "12m", "5h", "3d").
 * @returns An object with amount (number) and unit ("m", "h", or "d").
 * @throws If the input format is invalid.
 */
export function parseTimeRange(str: string): { amount: number; unit: "m" | "h" | "d" } {
  const match = /^(\d+)([mhd])$/.exec(str);
  if (!match) throw new Error("Invalid time range format. Use format like '12m', '12h', or '12d'");
  return { amount: parseInt(match[1], 10), unit: match[2] as "m" | "h" | "d" };
}

/**
 * Returns configuration for time bucketing: interval size, bucket granularity, and date grouping for MongoDB.
 *
 * Example:
 *   getTimeRangeConfig(12, "h")
 *   // => { intervalMs: 43200000, granularityMs: 3600000, dateGrouping: { ... } }
 *
 * @param amount - The number of units in the range (e.g., 12 for 12h).
 * @param unit - The unit ("m" for minutes, "h" for hours, "d" for days).
 * @returns An object containing intervalMs, granularityMs, and a MongoDB dateGrouping object.
 * @throws If the unit is invalid.
 */
export function getTimeRangeConfig(amount: number, unit: "m" | "h" | "d") {
  switch (unit) {
    case "m":
      return {
        intervalMs: amount * 60 * 1000,
        granularityMs: 60 * 1000,
        dateGrouping: {
          year: { $year: "$timestamp" },
          month: { $month: "$timestamp" },
          day: { $dayOfMonth: "$timestamp" },
          hour: { $hour: "$timestamp" },
          minute: { $minute: "$timestamp" },
        },
      };
    case "h":
      return {
        intervalMs: amount * 60 * 60 * 1000,
        granularityMs: 60 * 60 * 1000,
        dateGrouping: {
          year: { $year: "$timestamp" },
          month: { $month: "$timestamp" },
          day: { $dayOfMonth: "$timestamp" },
          hour: { $hour: "$timestamp" },
        },
      };
    case "d":
      return {
        intervalMs: amount * 24 * 60 * 60 * 1000,
        granularityMs: 24 * 60 * 60 * 1000,
        dateGrouping: {
          year: { $year: "$timestamp" },
          month: { $month: "$timestamp" },
          day: { $dayOfMonth: "$timestamp" },
        },
      };
  }
}

/**
 * Generates an array of Date objects representing all time buckets within a range,
 * rounded down to the nearest minute, hour, or day as appropriate.
 *
 * Example:
 *   generateTimeBuckets(start, end, 3600000, "h")
 *   // => [Date, Date, Date, ...] (one for each hour between start and end)
 *
 * @param startTime - The start of the interval (inclusive).
 * @param endTime - The end of the interval (inclusive).
 * @param granularityMs - The size of each bucket in milliseconds.
 * @param unit - The granularity unit ("m" for minute, "h" for hour, "d" for day).
 * @returns An array of bucket Date objects.
 */
export function generateTimeBuckets(
  startTime: Date,
  endTime: Date,
  granularityMs: number,
  unit: "m" | "h" | "d",
): Date[] {
  const buckets: Date[] = [];
  for (
    let time = new Date(startTime.getTime() + granularityMs);
    time <= endTime;
    time = new Date(time.getTime() + granularityMs)
  ) {
    const bucket = new Date(time);
    switch (unit) {
      case "m":
        bucket.setUTCSeconds(0, 0);
        break;
      case "h":
        bucket.setUTCMinutes(0, 0, 0);
        break;
      case "d":
        bucket.setUTCHours(0, 0, 0, 0);
        break;
    }
    buckets.push(bucket);
  }
  return buckets;
}
