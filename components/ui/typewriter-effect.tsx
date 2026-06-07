"use client";

import { cn } from "@/lib/utils";
import { motion, stagger, useAnimate, useInView } from "motion/react";
import { useEffect } from "react";

type TypewriterWord = {
  text: string;
  className?: string;
};

type TypewriterEffectProps = {
  words: TypewriterWord[];
  className?: string;
  cursorClassName?: string;
  textClassName?: string;
  duration?: number;
  delay?: number;
};

export const TypewriterEffect = ({
  words,
  className,
  cursorClassName,
}: {
  words: TypewriterWord[];
  className?: string;
  cursorClassName?: string;
}) => {
  const wordsArray = words.map((word) => ({
    ...word,
    text: word.text.split(""),
  }));

  const [scope, animate] = useAnimate();
  const isInView = useInView(scope);

  useEffect(() => {
    if (isInView) {
      animate(
        "span",
        {
          display: "inline-block",
          opacity: 1,
          width: "fit-content",
        },
        {
          duration: 0.3,
          delay: stagger(0.1),
          ease: "easeInOut",
        },
      );
    }
  }, [animate, isInView]);

  const renderWords = () => (
    <div>
      {wordsArray.map((word, idx) => (
        <div key={`word-${idx}`} className="inline-block">
          {word.text.map((char, index) => (
            <span
              key={`char-${index}`}
              className={cn("inline-block opacity-0", word.className)}
            >
              {char}
            </span>
          ))}
          &nbsp;
        </div>
      ))}
    </div>
  );

  return (
    <div ref={scope} className={cn("my-6", className)}>
      {renderWords()}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className={cn("inline-block rounded-sm w-[4px] h-4 md:h-6 xl:h-12 bg-blue-500", cursorClassName)}
      />
    </div>
  );
};

export const TypewriterEffectSmooth = ({
  words,
  className,
  cursorClassName,
  textClassName,
  duration = 2,
  delay = 0.3,
}: TypewriterEffectProps) => {
  const wordsArray = words.map((word) => ({
    ...word,
    text: word.text.split(""),
  }));

  const renderWords = () => (
    <div>
      {wordsArray.map((word, idx) => (
        <div key={`word-${idx}`} className="inline-block">
          {word.text.map((char, index) => (
            <span key={`char-${index}`} className={word.className}>
              {char}
            </span>
          ))}
          &nbsp;
        </div>
      ))}
    </div>
  );

  return (
    <div className={cn("flex items-end space-x-1", className)}>
      <motion.div
        className="overflow-hidden"
        initial={{ width: "0%" }}
        whileInView={{ width: "fit-content" }}
        viewport={{ once: true }}
        transition={{
          duration,
          ease: "linear",
          delay,
        }}
      >
        <div className={cn("font-bold", textClassName)} style={{ whiteSpace: "nowrap" }}>
          {renderWords()}
        </div>
      </motion.div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          repeatType: "reverse",
          delay: delay + duration,
        }}
        className={cn(
          "mb-1 block shrink-0 rounded-sm w-[4px] h-[0.9em] bg-blue-500",
          cursorClassName,
        )}
      />
    </div>
  );
};
