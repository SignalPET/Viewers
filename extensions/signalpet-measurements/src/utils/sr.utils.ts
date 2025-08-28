export const getSRDisplayName = (sr: any): string => {
  if (!sr) return 'Select version...';

  // Try to get a meaningful description
  if (sr.SeriesDescription) {
    return sr.SeriesDescription;
  }

  // If no description, try to format date/time
  const parts: string[] = [];

  if (sr.SeriesDate) {
    const date = new Date(sr.SeriesDate);
    if (!isNaN(date.getTime())) {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };
      parts.push(date.toLocaleDateString('en-US', options));
    }
  }

  if (sr.SeriesTime) {
    const time = sr.SeriesTime;
    // Format time if it's in HHMMSS format
    if (time.length >= 4) {
      const hours = time.substring(0, 2);
      const minutes = time.substring(2, 4);
      parts.push(`${hours}:${minutes}`);
    }
  }

  if (parts.length > 0) {
    return parts.join(', ');
  }

  // Fallback to series number or UID
  if (sr.SeriesNumber) {
    return `Series ${sr.SeriesNumber}`;
  }

  return sr.displaySetInstanceUID?.slice(-8) || 'Unknown version';
};
