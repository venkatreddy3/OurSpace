import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

// ─── Star rating (read-only when onChange is omitted) ───────────────────────
const Stars: React.FC<{ value: number; onChange?: (n: number) => void; size?: number }> = ({
  value,
  onChange,
  size = 18,
}) => {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button
          key={n}
          type="button"
          whileTap={onChange ? { scale: 1.25 } : undefined}
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHover(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={`p-0.5 ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= shown ? 'fill-amber-400/90 text-amber-400/90' : 'text-on-surface-variant/30'}
          />
        </motion.button>
      ))}
    </div>
  );
};

export default Stars;
