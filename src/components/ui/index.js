/**
 * UI Component Library for nanopub-create
 * Vanilla JS components following shadcn/ui philosophy
 * 
 * All components use Tailwind utility classes defined in src/styles/tailwind.base.css
 * 
 * @module components/ui
 */

// Button components
export {
  createButton,
  createButtonGroup
} from './button.js';

// Input components
export {
  createInput,
  createInputField,
  createUrlInput,
  createEmailInput
} from './input.js';

// Textarea components
export {
  createTextarea,
  createTextareaField
} from './textarea.js';

// Select components
export {
  createSelect,
  createSelectField,
  createGroupedSelect
} from './select.js';

// Label components
export {
  createLabel,
  createFieldset
} from './label.js';

// Badge components
export {
  createBadge,
  createStatusBadge
} from './badge.js';

// Card components
export {
  createCard,
  createCollapsibleCard
} from './card.js';

// Alert components
export {
  createAlert,
  createLoadingAlert,
  createErrorAlert,
  createToast
} from './alert.js';

// Utility
export { cn } from '../../utils/cn.js';
