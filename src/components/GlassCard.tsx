import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Slightly heavier damping for a "solid" feel
    const springConfig = { damping: 40, stiffness: 200 };
    const mouseXSpring = useSpring(x, springConfig);
    const mouseYSpring = useSpring(y, springConfig);

    // Subtler, more expensive looking tilt
    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["4deg", "-4deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-4deg", "4deg"]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Smooth factor to avoid edges jitter
        x.set((e.clientX - rect.left) / width - 0.5);
        y.set((e.clientY - rect.top) / height - 0.5);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
                perspective: "1200px",
            }}
            className={`glass-panel ${className}`}
        >
            {/* Higher Z translation for depth */}
            <div style={{ transform: "translateZ(40px)", transformStyle: "preserve-3d" }}>
                {children}
            </div>
        </motion.div>
    );
};
