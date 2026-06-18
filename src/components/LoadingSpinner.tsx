import type { Component } from 'solid-js';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };

const LoadingSpinner: Component<Props> = (props) => (
  <div class="flex flex-col items-center justify-center gap-3 py-8">
    <div
      class={`${sizes[props.size ?? 'md']} border-3 border-gray-600 border-t-blue-500 rounded-full animate-spin`}
    />
    {props.text && <p class="text-gray-400 text-sm">{props.text}</p>}
  </div>
);

export default LoadingSpinner;
