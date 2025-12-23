import { format, parse, parseISO } from 'date-fns';

/**
 * Format time in 12-hour format with AM/PM
 * @param {string} time24 - Time in 24h format (HH:mm)
 * @returns {string} Formatted time (e.g., "9:00 AM")
 */
export const formatTime12Hour = (time24) => {
  if (!time24) return '';
  
  try {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12; // Convert 0, 12, 24 to 12
    return `${displayHour}:${minutes} ${ampm}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return time24; // Return original if parsing fails
  }
};

/**
 * Convert 12-hour time to 24-hour format
 * @param {string} time12 - Time in 12h format (e.g., "9:00 AM")
 * @returns {string} Time in 24h format (HH:mm)
 */
export const convertTo24Hour = (time12) => {
  if (!time12) return '';
  
  try {
    const [time, period] = time12.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (period === 'PM' && hours !== '12') {
      hours = String(parseInt(hours, 10) + 12);
    } else if (period === 'AM' && hours === '12') {
      hours = '00';
    }
    
    return `${hours.padStart(2, '0')}:${minutes}`;
  } catch (error) {
    console.error('Error converting time to 24h format:', error);
    return time12; // Return original if conversion fails
  }
};

/**
 * Get current time in user's timezone
 * @param {string} timeZone - IANA timezone (e.g., 'America/New_York')
 * @returns {Date} Current date in specified timezone
 */
export const getCurrentTimeInTimeZone = (timeZone = 'UTC') => {
  const now = new Date();
  const dateStr = now.toLocaleString('en-US', { timeZone });
  return new Date(dateStr);
};

/**
 * Convert date to specific timezone
 * @param {Date|string} date - Date to convert
 * @param {string} timeZone - Target IANA timezone
 * @returns {Date} Date in target timezone
 */
export const convertToTimeZone = (date, timeZone) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const dateStr = dateObj.toLocaleString('en-US', { timeZone });
  return new Date(dateStr);
};

/**
 * Convert a scheduled time from campaign timezone to UTC for database storage
 * @param {Date|string} scheduledTime - Time in campaign timezone
 * @param {string} campaignTimezone - Campaign's IANA timezone
 * @returns {Date} UTC date for database storage
 */
export const convertScheduledTimeToUTC = (scheduledTime, campaignTimezone = 'UTC') => {
  if (!scheduledTime) return null;

  const dateObj = typeof scheduledTime === 'string' ? new Date(scheduledTime) : scheduledTime;

  if (campaignTimezone === 'UTC') {
    return dateObj;
  }

  // Get the offset between the campaign timezone and UTC
  const now = new Date();
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: campaignTimezone }));
  const offset = tzDate.getTime() - utcDate.getTime();
  
  // Subtract the offset to get UTC time
  return new Date(dateObj.getTime() - offset);
};

/**
 * Get timezone offset in milliseconds
 * @param {string} timezone - IANA timezone identifier
 * @returns {number} Offset in milliseconds
 */
export const getTimezoneOffset = (timezone) => {
  const now = new Date();
  const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
  return targetTime.getTime() - utc.getTime();
};

/**
 * Check if a time is within business hours for a given timezone
 * @param {Date} date - Date to check
 * @param {Object} businessHours - Business hours configuration
 * @param {string} timezone - IANA timezone
 * @returns {boolean} True if within business hours
 */
export const isWithinBusinessHours = (date, businessHours, timezone = 'UTC') => {
  if (!businessHours?.enabled) return true;

  const dateInTZ = convertToTimeZone(date, timezone);
  const dayOfWeek = dateInTZ.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const hour = dateInTZ.getHours();
  const minute = dateInTZ.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  // Check if day is in business days
  if (!businessHours.daysOfWeek?.includes(dayOfWeek)) {
    return false;
  }

  // Parse business hours
  const [startHour, startMin] = (businessHours.startTime || '09:00').split(':').map(Number);
  const [endHour, endMin] = (businessHours.endTime || '17:00').split(':').map(Number);

  const startTimeInMinutes = startHour * 60 + startMin;
  const endTimeInMinutes = endHour * 60 + endMin;

  return timeInMinutes >= startTimeInMinutes && timeInMinutes <= endTimeInMinutes;
};

/**
 * Format date with timezone using browser's Intl API
 * @param {Date|string} date - Date to format
 * @param {string} formatStr - Date format string (limited support)
 * @param {string} timeZone - IANA timezone
 * @returns {string} Formatted date string
 */
export const formatDateInTimeZone = (date, formatStr, timeZone = 'UTC') => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!(dateObj instanceof Date) || isNaN(dateObj)) {
      throw new Error('Invalid date');
    }
    
    // Simple formatter - can be extended based on formatStr needs
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: formatStr.includes('y') ? 'numeric' : undefined,
      month: formatStr.includes('MMM') ? 'short' : formatStr.includes('M') ? 'numeric' : undefined,
      day: formatStr.includes('d') ? 'numeric' : undefined,
      hour: formatStr.includes('h') ? 'numeric' : formatStr.includes('H') ? '2-digit' : undefined,
      minute: formatStr.includes('m') ? '2-digit' : undefined,
      second: formatStr.includes('s') ? '2-digit' : undefined,
      hour12: formatStr.includes('a') || formatStr.includes('h'),
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date with timezone:', error);
    return '';
  }
};

/**
 * Validate time string (HH:mm)
 * @param {string} time - Time string to validate
 * @returns {boolean} True if valid
 */
export const isValidTime = (time) => {
  if (!time) return false;
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
};

/**
 * Generate time slots with proper formatting
 * @param {string} start - Start time (HH:mm)
 * @param {string} end - End time (HH:mm)
 * @param {number} interval - Interval in minutes
 * @returns {Array} Array of time slots
 */
export const generateTimeSlots = (start = '06:00', end = '21:30', interval = 30) => {
  const slots = [];
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  
  let currentHour = startHour;
  let currentMinute = startMinute;
  
  while (currentHour < endHour || (currentHour === endHour && currentMinute <= endMinute)) {
    const hour = String(currentHour).padStart(2, '0');
    const minute = String(currentMinute).padStart(2, '0');
    const time24 = `${hour}:${minute}`;
    
    slots.push({
      value: time24,
      label: formatTime12Hour(time24)
    });
    
    // Increment time
    currentMinute += interval;
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute = currentMinute % 60;
    }
  }
  
  return slots;
};
