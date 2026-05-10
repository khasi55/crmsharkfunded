import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'trustbox-verified-review-collector': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'businessunit-id'?: string;
          'template-id'?: string;
          'data-locale'?: string;
          'class'?: string;
          'id'?: string;
          'ref'?: any;
        },
        HTMLElement
      >;
    }
  }
}

export {};
