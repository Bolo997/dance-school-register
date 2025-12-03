import { useMemo } from 'react';
import { generateTimeSlots } from '../utils/helpers';

export function useTimeSlots() {
  return useMemo(() => generateTimeSlots(), []);
}
