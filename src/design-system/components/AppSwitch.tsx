import React, { useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { haptic } from '../animations/haptics';
import { makeStyles, useTheme } from '../theme/ThemeProvider';

export interface AppSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
}

export function AppSwitch({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
  testID,
}: AppSwitchProps) {
  const theme = useTheme();
  const styles = useStyles();
  const position = useRef(new Animated.Value(value ? 1 : 0)).current;
  const thumbSize = theme.sizes.switchHeight - theme.spacing.xs * 2;
  const travel = theme.sizes.switchWidth - thumbSize - theme.spacing.xs * 2;

  useEffect(() => {
    Animated.timing(position, {
      toValue: value ? 1 : 0,
      duration: theme.durations.fast,
      easing: theme.easings.standard,
      useNativeDriver: false,
    }).start();
  }, [position, theme, value]);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => {
        haptic('selection');
        onValueChange(!value);
      }}
      style={disabled && styles.disabled}
    >
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: position.interpolate({
              inputRange: [0, 1],
              outputRange: [theme.colors.surfaceHighlight, theme.colors.primary],
            }),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              width: thumbSize,
              height: thumbSize,
              transform: [
                {
                  translateX: position.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, travel],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles(theme => ({
  track: {
    width: theme.sizes.switchWidth,
    height: theme.sizes.switchHeight,
    borderRadius: theme.radius.pill,
    padding: theme.spacing.xs,
    justifyContent: 'center',
  },
  thumb: { borderRadius: theme.radius.pill, backgroundColor: theme.colors.textPrimary },
  disabled: { opacity: theme.opacity.disabled },
}));
