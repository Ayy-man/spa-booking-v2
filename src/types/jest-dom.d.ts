import '@testing-library/jest-dom'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toBeVisible(): R
      toBeDisabled(): R
      toHaveClass(className: string | RegExp): R
      toHaveAttribute(attributeName: string, value?: string): R
      toHaveTextContent(text: string | RegExp): R
      toHaveValue(value: string | number): R
      toBeChecked(): R
      toHaveFocus(): R
      toBeEmptyDOMElement(): R
      toBeInvalid(): R
      toBeRequired(): R
      toBeValid(): R
      toContainElement(element: HTMLElement | null): R
      toContainHTML(htmlText: string): R
      toHaveDescription(text?: string | RegExp): R
      toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R
      toHaveErrorMessage(text?: string | RegExp): R
      toHaveFormValues(expectedValues: Record<string, any>): R
      toHaveStyle(css: string | Record<string, any>): R
      toHaveAccessibleDescription(text?: string | RegExp): R
      toHaveAccessibleName(text?: string | RegExp): R
      toBePartiallyChecked(): R
    }
  }
}