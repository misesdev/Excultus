import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { AppText } from '../typography/AppText';
import { useTranslation } from '../hooks/useTranslation';

export interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  testID?: string;
}

const DISMISS_DRAG_DISTANCE = 96;
const DISMISS_VELOCITY = 1.2;

/**
 * Modal bottom sheet with drag-to-dismiss on the handle, backdrop tap and
 * Android back button support. Content scrolls inside when it is tall.
 */
export function AppBottomSheet({
  visible,
  onClose,
  title,
  testID,
  children,
}: PropsWithChildren<AppBottomSheetProps>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(windowHeight)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(windowHeight);
      Animated.timing(translateY, {
        toValue: 0,
        duration: theme.durations.normal,
        easing: theme.easings.decelerate,
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(translateY, {
        toValue: windowHeight,
        duration: theme.durations.fast,
        easing: theme.easings.accelerate,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
    // `mounted` intentionally omitted: it only gates the closing animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, windowHeight, theme, translateY]);

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 4,
        onPanResponderMove: (_event, gesture) =>
          translateY.setValue(Math.max(0, gesture.dy)),
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy > DISMISS_DRAG_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
            onCloseRef.current();
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [translateY],
  );

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: translateY.interpolate({
              inputRange: [0, windowHeight],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <Pressable
          style={styles.fill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
      </Animated.View>
      <Animated.View
        testID={testID}
        accessibilityViewIsModal
        style={[
          styles.sheet,
          {
            maxHeight: windowHeight * theme.sizes.bottomSheetMaxHeightRatio,
            paddingBottom: insets.bottom + theme.spacing.lg,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.handleArea} {...dragResponder.panHandlers}>
          <View style={styles.handle} />
          {title && (
            <AppText
              variant="subheading"
              align="center"
              accessibilityRole="header"
              numberOfLines={2}
            >
              {title}
            </AppText>
          )}
        </View>
        {children}
      </Animated.View>
    </Modal>
  );
}

const useStyles = makeStyles(theme => ({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.scrim,
  },
  fill: { flex: 1 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    ...theme.shadows.high,
  },
  handleArea: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.md,
    alignItems: 'stretch',
  },
  handle: {
    alignSelf: 'center',
    width: theme.sizes.bottomSheetHandle.width,
    height: theme.sizes.bottomSheetHandle.height,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceHighlight,
  },
}));
