"use client";

import React, { useId } from "react";
import { Camera, FolderOpen, Upload } from "lucide-react";
import styles from "./ImageUploader.module.css";

interface ImageUploaderProps {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  title: string;
  accept: string;
}

export default function ImageUploader({ onChange, title, accept }: ImageUploaderProps) {
  const inputId = useId();
  const cameraInputId = `${inputId}-camera`;

  return (
    <div className={styles.uploader}>
      <label htmlFor={inputId} className={styles.desktopPicker}>
        <Upload className={styles.icon} size={46} strokeWidth={1.8} />
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>Choose an image from your device</p>
        <p className={styles.formats}>JPG, PNG, WebP and HEIC</p>
      </label>

      <div className={styles.mobileActions}>
        <label htmlFor={cameraInputId} className={`${styles.action} ${styles.cameraAction}`}>
          <Camera size={20} /> Camera
        </label>
        <label htmlFor={inputId} className={styles.action}>
          <FolderOpen size={20} /> Choose Files
        </label>
      </div>

      <input id={inputId} type="file" accept={accept} onChange={onChange} className={styles.hiddenInput} />
      <input id={cameraInputId} type="file" accept="image/*" capture="environment" onChange={onChange} className={styles.hiddenInput} />
    </div>
  );
}
