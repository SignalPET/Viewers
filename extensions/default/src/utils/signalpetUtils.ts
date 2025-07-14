export const Dcm4cheePrivateTags = {
  "StudyReceiveDateTime": "77771020",
  "SeriesReceiveDateTime": "77771030",
  "InstanceReceiveDateTime": "77771040",
};

export function splitDicomDateTime(dateTime: string): [string, string] {
  // YYYYMMDDHHMMSS.FFF+ZZZZ => [ YYYYMMDD, HHMMSS.FFF ]
  return [ dateTime.substr(0, 8), dateTime.substr(8, 10) ];
}

export function fillInstanceDateTimeFallback(instance: Record<string, unknown>) {
    const dateTimeFallbacks = [
      [ instance.InstanceCreationDate, instance.InstanceCreationTime ],
      [ instance.AcquisitionDate, instance.AcquisitionTime ],
    ];

    const archiveDateTime = instance[Dcm4cheePrivateTags.InstanceReceiveDateTime] as string;
    if (archiveDateTime != null) {
      dateTimeFallbacks.push(splitDicomDateTime(archiveDateTime));
    }

    for (const [ date, time ] of dateTimeFallbacks) {
      if (date == null || time == null) {
        continue;
      }

      if (instance.StudyDate == null) {
        instance.StudyDate = date;
        instance.StudyTime = time;
      }
      if (instance.SeriesDate == null) {
        instance.SeriesDate = date;
        instance.SeriesTime = time;
      }
      break;
    }
}
