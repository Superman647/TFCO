import React, { useMemo, useState } from 'react';
import { MessageSquareQuote, Trophy, Shield, Zap, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface Props {
  matchResult: {
    score: string;
    opponent: string;
    competition: string;
    isWinner: boolean;
    playerPerformance?: string;
  };
  onFinish: (summary: string) => void;
}

const toneOptions = [
  { id: 'calm', label: 'Bình tĩnh', icon: Shield, text: 'Chúng tôi giữ được sự tập trung và kiểm soát thế trận trong nhiều thời điểm quan trọng.' },
  { id: 'aggressive', label: 'Quyết liệt', icon: Zap, text: 'Đội bóng đã chơi với cường độ cao, gây sức ép liên tục và không lùi bước.' },
  { id: 'confident', label: 'Tự tin', icon: Trophy, text: 'Toàn đội thể hiện bản lĩnh lớn và cho thấy chất lượng của một tập thể có tham vọng.' },
];

export default function InterviewScreen({ matchResult, onFinish }: Props) {
  const [selectedTone, setSelectedTone] = useState('confident');
  const [customLine, setCustomLine] = useState('');

  const autoSummary = useMemo(() => {
    const tone = toneOptions.find(t => t.id === selectedTone)?.text || toneOptions[2].text;
    const resultLine = matchResult.isWinner
      ? `Kết quả ${matchResult.score} trước ${matchResult.opponent} là phần thưởng xứng đáng cho nỗ lực của toàn đội.`
      : `Dù kết quả ${matchResult.score} trước ${matchResult.opponent} chưa như mong muốn, đây vẫn là trận đấu mang lại nhiều bài học.`;

    return [
      `${matchResult.competition}: ${resultLine}`,
      tone,
      matchResult.playerPerformance || 'Một vài cá nhân đã để lại dấu ấn, nhưng điều quan trọng nhất vẫn là tinh thần tập thể.',
      customLine.trim(),
    ].filter(Boolean).join(' ');
  }, [selectedTone, customLine, matchResult]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(180deg,_#08120f_0%,_#05080c_100%)] text-white p-4 md:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="glass-panel p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="ui-kicker mb-3">Post-match interview</div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight">Họp báo sau trận</h1>
              <p className="text-zinc-300 mt-3 max-w-2xl">
                Chọn phong cách trả lời để tạo cảm giác chuyên nghiệp, đậm chất game bóng đá quản lý hiện đại.
              </p>
            </div>
            <button
              onClick={() => onFinish('')}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Bỏ qua
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="glass-panel p-6 space-y-5">
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/20">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-zinc-400 text-sm">Kết quả</div>
                  <div className="text-2xl font-black">{matchResult.score}</div>
                </div>
                <div className="text-right">
                  <div className="text-zinc-400 text-sm">Đối thủ</div>
                  <div className="text-lg font-bold">{matchResult.opponent}</div>
                </div>
              </div>
              <div className="p-5 grid sm:grid-cols-3 gap-3 text-sm">
                <div className="stat-chip"><span>Giải đấu</span><strong>{matchResult.competition}</strong></div>
                <div className="stat-chip"><span>Trạng thái</span><strong>{matchResult.isWinner ? 'Chiến thắng' : 'Chưa thắng'}</strong></div>
                <div className="stat-chip"><span>Điểm nhấn</span><strong>{matchResult.playerPerformance || 'Tinh thần tập thể'}</strong></div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-3">Chọn phong cách trả lời</h2>
              <div className="grid md:grid-cols-3 gap-3">
                {toneOptions.map((tone) => {
                  const Icon = tone.icon;
                  const active = selectedTone === tone.id;
                  return (
                    <button
                      key={tone.id}
                      onClick={() => setSelectedTone(tone.id)}
                      className={`rounded-2xl p-4 text-left border transition-all ${active ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                    >
                      <Icon className="w-5 h-5 mb-3 text-emerald-300" />
                      <div className="font-bold mb-1">{tone.label}</div>
                      <div className="text-sm text-zinc-400">{tone.text}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Thêm câu nhấn mạnh của riêng bạn</label>
              <textarea
                value={customLine}
                onChange={(e) => setCustomLine(e.target.value)}
                rows={4}
                placeholder="Ví dụ: Chúng tôi sẽ tiếp tục cải thiện khả năng chuyển trạng thái và dứt điểm trong vòng cấm."
                className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-emerald-400 resize-none"
              />
            </div>
          </div>

          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center border border-emerald-400/20">
                <MessageSquareQuote className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <div className="ui-kicker">Preview</div>
                <h2 className="text-xl font-black">Phát biểu của HLV</h2>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-5 leading-7 text-zinc-100 min-h-64">
              {autoSummary}
            </div>

            <button
              onClick={() => onFinish(autoSummary)}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-black text-black hover:brightness-110 transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              Xác nhận phát biểu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
