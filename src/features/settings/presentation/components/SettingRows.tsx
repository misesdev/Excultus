import React, { useState } from 'react';
import {
  AppListItem,
  AppSwitch,
  AppText,
  type IconName,
  useTranslation,
} from '@design-system';
import { OptionSheet, type Option } from '@shared/components/OptionSheet';

export function SwitchSetting({
  title,
  subtitle,
  icon,
  value,
  onChange,
  testID,
}: {
  title: string;
  subtitle?: string;
  icon: IconName;
  value: boolean;
  onChange: (value: boolean) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  return (
    <AppListItem
      title={title}
      subtitle={subtitle}
      leadingIcon={icon}
      onPress={() => onChange(!value)}
      accessibilityLabel={`${title}: ${value ? t('settings.on') : t('settings.off')}`}
      trailing={
        <AppSwitch
          value={value}
          onValueChange={onChange}
          accessibilityLabel={title}
          testID={testID}
        />
      }
    />
  );
}

export function ChoiceSetting<T extends string | number>({
  title,
  icon,
  value,
  options,
  onChange,
  testID,
}: {
  title: string;
  icon: IconName;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = options.find(option => option.value === value)?.label ?? String(value);
  return (
    <>
      <AppListItem
        testID={testID}
        title={title}
        leadingIcon={icon}
        onPress={() => setOpen(true)}
        accessibilityLabel={`${title}: ${label}`}
        trailing={
          <AppText variant="captionStrong" color="primary">
            {label}
          </AppText>
        }
      />
      <OptionSheet
        visible={open}
        title={title}
        options={options}
        selected={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
