import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Helper to get days in the selected week
const getWeekDays = (weekStart) => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push(d);
  }
  return days;
};

const DateSelector = ({ selectedWeekStart, setSelectedWeekStart, selectedDay, setSelectedDay }) => {
  // Helper to get start of this week
  const getStartOfThisWeek = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return start;
  };
  const initialWeekStart = getStartOfThisWeek();
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  // Week navigation
  const changeWeek = (direction) => {
    const newStart = new Date(selectedWeekStart);
    newStart.setDate(newStart.getDate() + direction * 7);
    // Limit to 6 months in advance, but allow going back to the initial week
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    if (newStart <= sixMonthsFromNow && newStart >= initialWeekStart) {
      setSelectedWeekStart(newStart);
      setSelectedDay(null); // Do not auto-select any day when changing weeks
    }
  };

  return (
    <>
      {/* Week Navigation */}
      <View style={styles.dateSelector}>
        <TouchableOpacity style={styles.dateArrow} onPress={() => changeWeek(-1)}>
          <Ionicons name="chevron-back" size={24} color="#00BFFF" />
        </TouchableOpacity>
        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>
            Week of {selectedWeekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity style={styles.dateArrow} onPress={() => changeWeek(1)}>
          <Ionicons name="chevron-forward" size={24} color="#00BFFF" />
        </TouchableOpacity>
      </View>
      {/* Days of the week */}
      <View style={styles.weekDaysRow}>
        {getWeekDays(selectedWeekStart).map((day, idx) => {
          const isSelected = selectedDay && day.toDateString() === selectedDay.toDateString();
          // Only apply today style if not selected
          const isToday = !isSelected && day.toDateString() === todayDate.toDateString();
          // Limit to 6 months in advance
          const sixMonthsFromNow = new Date();
          sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
          // Only allow selecting today or future days
          const isDisabled = day < todayDate || day > sixMonthsFromNow;
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dayButton,
                isSelected ? styles.selectedDayButton : isToday ? styles.todayButton : null,
                isDisabled && styles.disabledDayButton,
              ]}
              onPress={() => {
                if (isDisabled) return;
                setSelectedDay(day);
              }}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.dayButtonText,
                  isSelected ? styles.selectedDayButtonText : isToday ? styles.todayButtonText : null,
                  isDisabled && styles.disabledDayButtonText,
                ]}
              >
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text
                style={[
                  styles.dayButtonText,
                  isSelected ? styles.selectedDayButtonText : isToday ? styles.todayButtonText : null,
                  isDisabled && styles.disabledDayButtonText,
                ]}
              >
                {day.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedDay && (
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Text style={{ fontSize: 16, color: '#00BFFF', fontWeight: 'bold' }}>
            Selected: {selectedDay.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  dateArrow: {
    padding: 8,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dayButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  selectedDayButton: {
    backgroundColor: '#e3f2fd',
  },
  selectedDayButtonText: {
    fontWeight: 'bold',
    color: '#00BFFF',
  },
  todayButton: {
    backgroundColor: '#e3f2fd',
  },
  todayButtonText: {
    fontWeight: 'bold',
    color: '#00BFFF',
  },
  disabledDayButton: {
    backgroundColor: '#f0f0f0',
  },
  disabledDayButtonText: {
    color: '#ccc',
  },
});

export default DateSelector; 