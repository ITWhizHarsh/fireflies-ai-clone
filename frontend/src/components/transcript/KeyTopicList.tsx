import type { KeyTopic } from "@/lib/types";

interface KeyTopicListProps {
  topics: KeyTopic[];
}

const TOPIC_COLORS = [
  "bg-violet-600/15 text-violet-300 border-violet-600/20",
  "bg-blue-600/15 text-blue-300 border-blue-600/20",
  "bg-emerald-600/15 text-emerald-300 border-emerald-600/20",
  "bg-amber-600/15 text-amber-300 border-amber-600/20",
  "bg-rose-600/15 text-rose-300 border-rose-600/20",
  "bg-cyan-600/15 text-cyan-300 border-cyan-600/20",
];

export function KeyTopicList({ topics }: KeyTopicListProps) {
  if (topics.length === 0) {
    return <p className="text-sm text-gray-500">No key topics available.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {topics.map((topic, i) => (
        <span
          key={topic.id}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${TOPIC_COLORS[i % TOPIC_COLORS.length]}`}
        >
          {topic.topic}
        </span>
      ))}
    </div>
  );
}
