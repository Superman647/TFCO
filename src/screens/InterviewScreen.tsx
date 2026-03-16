import React from 'react';
interface Props { matchResult: any; onFinish: (summary?: string) => void; }
export default function InterviewScreen({ matchResult, onFinish }: Props) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <h2 className="text-5xl font-black text-white mb-4" style={{fontFamily:"'Bebas Neue'"}}>PHỎNG VẤN SAU TRẬN</h2>
      <p className="text-white/60 mb-8 text-center">Kết quả: {matchResult?.score} trước {matchResult?.opponent}</p>
      <button onClick={() => onFinish()} className="btn-fc-primary px-12 py-4 rounded-xl text-xl font-black">TIẾP TỤC</button>
    </div>
  );
}
