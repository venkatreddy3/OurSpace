import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ImagePlus } from 'lucide-react';
import type { GalleryItem } from '../../services/gallery.service.js';

const TILTS = [-3, 2, -1.5, 3, -2.5, 1.5];

/**
 * RecentMoments
 * The latest photos from the shared gallery as a row of slightly tilted prints that straighten on hover.
 */
const RecentMoments: React.FC<{ photos: GalleryItem[] | null }> = ({ photos }) => {
  const reduce = useReducedMotion();
  const latest = (photos ?? []).slice(0, 6);

  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24" aria-labelledby="recent-heading">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 id="recent-heading" className="font-display text-3xl sm:text-5xl">
          Latest moments
        </h2>
        <Link to="/gallery" className="group inline-flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors">
          Open gallery <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {latest.length === 0 ? (
        <Link
          to="/gallery"
          className="card-edge flex flex-col items-center gap-3 rounded-[28px] px-6 py-12 text-center transition-transform duration-300 hover:-translate-y-1"
        >
          <ImagePlus className="h-10 w-10 text-primary" />
          <p className="font-display text-2xl">{photos === null ? 'Looking for your photos…' : 'No photos yet'}</p>
          {photos !== null && <p className="text-sm text-on-surface-variant">Add your first photo and it will show up here.</p>}
        </Link>
      ) : (
        <div className="-mx-5 flex gap-5 overflow-x-auto px-5 pb-6 pt-2 sm:mx-0 sm:px-0 [scrollbar-width:thin]">
          {latest.map((photo, i) => (
            <motion.div
              key={photo.id}
              className="shrink-0"
              initial={reduce ? false : { opacity: 0, y: 30, rotate: 0 }}
              whileInView={{ opacity: 1, y: 0, rotate: TILTS[i % TILTS.length] }}
              viewport={{ once: true, margin: '-30px' }}
              whileHover={reduce ? undefined : { rotate: 0, y: -8, scale: 1.04 }}
              transition={{ duration: 0.6, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                to="/gallery"
                className="block w-44 sm:w-52 rounded-md bg-[#fdfaf4] p-2.5 pb-4 shadow-xl shadow-black/15 ring-1 ring-black/5"
                aria-label={photo.caption || 'Open the gallery'}
              >
                <img src={photo.photoUrl} alt={photo.caption || ''} loading="lazy" className="aspect-square w-full rounded-sm object-cover" />
                <p className="mt-2.5 truncate px-1 text-center font-serif text-sm italic text-[#3a3340]">{photo.caption}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
};

export default RecentMoments;
