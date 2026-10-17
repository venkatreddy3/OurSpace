import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { Milestone } from '../../types/memory.js';

// ─── Single image frame ───────────────────────────────────────────────────────
interface ImageFrameProps {
  src: string;
  alt: string;
}

const ImageFrame: React.FC<ImageFrameProps> = ({ src, alt }) => (
  <div
    className="overflow-hidden group"
    style={{
      borderRadius: 12,
      background: 'var(--bg-surface-container)',
      border: '1px solid var(--border-gray)',
      boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
    }}
  >
    <img
      src={src}
      alt={alt}
      className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
      style={{ display: 'block', height: 240 }}
      draggable={false}
    />
  </div>
);

// ─── Milestone Item ───────────────────────────────────────────────────────────
interface MilestoneItemProps {
  milestone: Milestone;
  index: number;
}

const MilestoneItem: React.FC<MilestoneItemProps> = ({ milestone, index }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const { dateLabel, title, caption, imageUrls = [], layout } = milestone;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.65,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative timeline-item"
    >
      {/* ─── Node dot, absolute over the left border line ─────────── */}
      <div
        className="absolute"
        style={{
          left: -31,
          top: 4,
          width: 11,
          height: 11,
          borderRadius: '50%',
          background: 'var(--primary)',
          boxShadow:
            '0 0 0 3px var(--bg-background), 0 0 8px var(--primary)',
          flexShrink: 0,
        }}
      />

      {/* ─── Date label ───────────────────────────────────────────── */}
      <p
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--on-surface-variant)',
          opacity: 0.8,
          marginBottom: 10,
        }}
      >
        {dateLabel}
      </p>

      {/* ─── Milestone title ──────────────────────────────────────── */}
      <h3
        style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: 19,
          fontWeight: 600,
          color: 'var(--on-surface)',
          lineHeight: 1.35,
          marginBottom: imageUrls.length > 0 ? 18 : caption ? 12 : 0,
        }}
      >
        {title}
      </h3>

      {/* ─── Media container ──────────────────────────────────────── */}
      {layout === 'single' && imageUrls[0] && (
        <div style={{ marginBottom: caption ? 16 : 0 }}>
          <ImageFrame src={imageUrls[0]} alt={title} />
        </div>
      )}

      {layout === 'grid' && imageUrls.length >= 2 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: caption ? 16 : 0,
          }}
        >
          {imageUrls.slice(0, 2).map((url, i) => (
            <ImageFrame key={i} src={url} alt={`${title} ${i + 1}`} />
          ))}
        </div>
      )}

      {/* ─── Caption ──────────────────────────────────────────────── */}
      {caption && (
        <p
          className="text-on-surface-variant font-light text-sm max-w-lg leading-relaxed"
          style={{
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          {caption}
        </p>
      )}
    </motion.div>
  );
};

// ─── Vertical Timeline ────────────────────────────────────────────────────────
interface VerticalTimelineProps {
  milestones: Milestone[];
  /** Anchor ID used for smooth-scroll targeting from external buttons */
  anchorId?: string;
}

const VerticalTimeline: React.FC<VerticalTimelineProps> = ({
  milestones,
  anchorId = 'journey-start',
}) => {
  if (milestones.length === 0) {
    return (
      <div className="py-20 text-center">
        <p
          style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontStyle: 'italic',
            fontSize: 16,
            color: 'var(--on-surface-variant)',
          }}
        >
          No milestones yet. Your story is just beginning.
        </p>
      </div>
    );
  }

  return (
    <section id={anchorId} className="w-full">
      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ marginBottom: 56, textAlign: 'center' }}
      >
        <p
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--on-surface-variant)',
            opacity: 0.65,
            marginBottom: 12,
          }}
        >
          Chapter by Chapter
        </p>
        <h2
          style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: 'clamp(22px, 4vw, 30px)',
            fontWeight: 600,
            color: 'var(--on-surface)',
          }}
        >
          Our Journey
        </h2>
      </motion.div>

      {/* Left-bordered timeline container */}
      <div
        style={{
          borderLeft: '1px solid var(--border-gray)',
          marginLeft: 16,
          paddingLeft: 32,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 56,
        }}
      >
        {milestones.map((milestone, index) => (
          <MilestoneItem key={milestone.id} milestone={milestone} index={index} />
        ))}

        {/* End-of-timeline marker */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ position: 'relative', paddingTop: 8 }}
        >
          {/* Final dot — slightly dimmer */}
          <div
            style={{
              position: 'absolute',
              left: -31 - 16,
              top: 4,
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: 'var(--border-gray)',
              boxShadow: '0 0 6px rgba(0,0,0,0.05)',
              marginLeft: 16,
            }}
          />
          <p
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--on-surface-variant)',
              opacity: 0.6,
            }}
          >
            More to come…
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default VerticalTimeline;
