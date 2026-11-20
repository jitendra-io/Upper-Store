import DeveloperStudio from '../pages/DeveloperStudio';

export const DeveloperStudioModal = ({ isOpen = false, onClose, onProductPublished }) => {
  if (!isOpen) return null;
  return (
    <DeveloperStudio
      isModal={true}
      isOpen={isOpen}
      onClose={onClose}
      onProductPublished={onProductPublished}
    />
  );
};

export default DeveloperStudioModal;
