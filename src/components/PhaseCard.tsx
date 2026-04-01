import { ReactNode } from "react";
import { motion } from "framer-motion";

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } }
};

export const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 }
};

interface PhaseCardProps {
  title: string;
  badge: ReactNode | string;
  badgeStyle?: string;
  children: ReactNode;
}

export const PhaseCard = ({ title, badge, badgeStyle = "bg-slate-200 text-slate-600", children }: PhaseCardProps) => {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
        <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded font-black ${badgeStyle}`}>{badge}</span>
      </div>
      {children}
    </motion.div>
  );
};
