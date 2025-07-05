import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label }) => {
  return (
    <label className="flex items-center gap-4 cursor-pointer">
      {label && (
        <span className="text-base text-gray-700 select-none">{label}</span>
      )}
      <div className="relative inline-block w-10 h-[22px]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="opacity-0 w-0 h-0 peer" // Added 'peer' here
        />
        <span
          className={`
            absolute top-0 left-0 right-0 bottom-0
            cursor-pointer rounded-full bg-gray-300 transition-colors duration-300
            peer-checked:bg-green-500
          `}
        >
          <span
            className={`
              absolute content-[''] h-4 w-4 left-[3px] bottom-[3px]
              bg-white rounded-full transition-transform duration-300 ease-in-out
              peer-checked:translate-x-[18px]
            `}
          ></span>
        </span>
      </div>
    </label>
  );
};

export default ToggleSwitch;
// ToggleSwitch component for rendering a toggle switch
// It receives checked state, change handler, and an optional label as props