import React from 'react';
import { Squad } from '../types';
import MatchScreen from './MatchScreen';

interface Props { squad:Squad; onBack:()=>void; }

export default function PracticeScreen({squad,onBack}:Props){
  return <MatchScreen squad={squad} onFinish={onBack} mode="TRAINING" drillType="SHOOTING" userTeamName="Luyện Tập" />;
}
