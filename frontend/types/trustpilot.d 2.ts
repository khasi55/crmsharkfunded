import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'trustbox-verified-review-collector': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'style-size'?: string;
        'locale'?: string;
        'template-id'?: string;
        'businessunit-id'?: string;
        'style-width'?: string;
        'border-type'?: string;
        'background'?: string;
        'has-animated-stars'?: string;
      };
    }
  }
}
