
import "@/components/apps/color-lab/color-lab.css";

interface ColorLabProps {
  isFocused: boolean;
  isMinimized?: boolean;
}

export default function ColorLab({ isFocused, isMinimized }: ColorLabProps) {
  if (isMinimized) {
    return null; 
  }

  return (
    <div className="w-full h-full">
      <div className="color-lab-container">
        <div className="color-lab-panel color-lab-left" />
        <div className="color-lab-panel color-lab-right" />
      </div>
    </div>
  );
}
