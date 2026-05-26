type RedundantEquivalence = {
  equivalenceId: number;
  fromPlayerName: string;
  fromPlayerOwner: string;
  toPlayerName: string;
  toPlayerOwner: string;
  linkOwnerUsername: string;
  linkLinkedUsername: string;
  intermediateUsername: string;
};

export default function RedundantEquivalencesTable({
  items,
}: {
  items: RedundantEquivalence[];
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-1 text-sm font-semibold text-zinc-300">
          Redundant Equivalences
        </h2>
        <p className="text-xs text-zinc-500 mb-3">
          Player equivalences that are also resolvable via the link graph and can safely be removed.
        </p>
        <p className="text-sm text-zinc-500">No redundant equivalences found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="mb-1 text-sm font-semibold text-zinc-300">
        Redundant Equivalences
        <span className="ml-2 rounded-full bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-400">
          {items.length}
        </span>
      </h2>
      <p className="text-xs text-zinc-500 mb-4">
        Player equivalences that are also resolvable via the link graph and can safely be removed.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
            <th className="pb-2 font-medium">ID</th>
            <th className="pb-2 font-medium">From Player</th>
            <th className="pb-2 font-medium">To Player</th>
            <th className="pb-2 font-medium">Link</th>
            <th className="pb-2 font-medium">Redundant via</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {items.map((item) => (
            <tr key={item.equivalenceId}>
              <td className="py-2.5 text-zinc-500 tabular-nums">
                #{item.equivalenceId}
              </td>
              <td className="py-2.5">
                <span className="font-medium text-zinc-200">{item.fromPlayerName}</span>
                <span className="ml-1 text-xs text-zinc-500">({item.fromPlayerOwner})</span>
              </td>
              <td className="py-2.5">
                <span className="font-medium text-zinc-200">{item.toPlayerName}</span>
                <span className="ml-1 text-xs text-zinc-500">({item.toPlayerOwner})</span>
              </td>
              <td className="py-2.5 text-zinc-400 text-xs">
                {item.linkOwnerUsername} ↔ {item.linkLinkedUsername}
              </td>
              <td className="py-2.5 text-xs text-zinc-400">
                <span className="font-medium text-zinc-200">{item.fromPlayerName}</span>
                {" represents "}
                <span className="text-emerald-400">@{item.intermediateUsername}</span>
                {", who is also linked to "}
                <span className="text-zinc-200">{item.toPlayerOwner}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
