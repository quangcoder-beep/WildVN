"use client";

import { useEffect, useRef } from "react";
import styles from "../../styles/ai-chat.module.css";

interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
}

export function StreamingText({ content, isStreaming }: StreamingTextProps) {
  return (
    <span>
      {content}
      {isStreaming && <span className={styles.cursor} aria-hidden="true" />}
    </span>
  );
}
