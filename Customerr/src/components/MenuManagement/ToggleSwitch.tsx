import React from 'react';
import styles from './ToggleSwitch.module.css';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label }) => {
  return (
    <label className={styles.toggleLabel}>
      {label && <span className={styles.toggleText}>{label}</span>}
      <div className={styles.switch}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={styles.toggleInput}
        />
        <span className={styles.slider}></span>
      </div>
    </label>
  );
};

export default ToggleSwitch;
// ToggleSwitch component for rendering a toggle switch
// It receives checked state, change handler, and an optional label as props