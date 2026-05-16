import { ReactNode } from 'react';

type Column<T> = {
  key: string;
  header: ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
  render: (row: T, index: number) => ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string | number;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
};

const alignStyles = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function Table<T>({ columns, rows, getRowKey, empty, onRowClick }: Props<T>) {
  if (rows.length === 0 && empty) {
    return <div className="py-12">{empty}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={`py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ${
                  alignStyles[col.align ?? 'left']
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={getRowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`${i % 2 === 1 ? 'bg-surface-container-low' : ''} ${
                onRowClick ? 'cursor-pointer hover:bg-surface-container-high transition-colors' : ''
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-4 px-4 ${alignStyles[col.align ?? 'left']} text-on-surface`}
                >
                  {col.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
