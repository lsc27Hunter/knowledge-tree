import MergeIcon from "../../assets/git_knowledgetree-icon.svg";
import { Button } from "./Button";


interface DiscoveryMergeButtonProps {
  gotoMerge(): void;
}

export default function DiscoveryMergeButton({ gotoMerge }: DiscoveryMergeButtonProps) {
  function onClick() {
    gotoMerge();
  }
  return (
    <>
      <Button
          text="Merge"
          color="primary-grey"
          textColor="fg"
          icon={MergeIcon}
          width="full-on-mobile"
          onClick={onClick}
          themeIcon
        />
    </>
  );
}
