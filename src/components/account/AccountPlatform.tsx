'use client';

import { useState } from 'react';
import DeviceManager from '@/components/auth/DeviceManager';
import AccessCodeRedeemer from './AccessCodeRedeemer';
import AssessmentDashboard, { type AssessmentDashboardProps } from './AssessmentDashboard';

type Props = Omit<AssessmentDashboardProps, 'deviceTrusted'> & {
  autoEnrollEligible: boolean;
};

export default function AccountPlatform({ autoEnrollEligible, ...dashboard }: Props) {
  const [deviceTrusted, setDeviceTrusted] = useState<boolean | null>(null);

  return (
    <>
      <DeviceManager
        autoEnrollEligible={autoEnrollEligible}
        onTrustChange={setDeviceTrusted}
      />
      <AccessCodeRedeemer />
      <AssessmentDashboard {...dashboard} deviceTrusted={deviceTrusted} />
    </>
  );
}
