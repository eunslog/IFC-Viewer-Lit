import { html, LitElement, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('search-box')
export class SearchBox extends LitElement {
  @property({ attribute: false }) onChange?: (value: string) => void;

  static styles = css`
    .search-container {
      display: flex;
      align-items: center;
      column-gap: 10px;
      width: 100%;
    }
    input {
      width: 100%;
      height: 40px;
      background-color: var(--background-100);
    }
  `;
  

  private handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = target.value;

    if (this.onChange) {
      this.onChange(value);
      console.log('value: ', value);
    }

    this.dispatchEvent(
      new CustomEvent('search-change', {
        detail: value,
        bubbles: true,
        composed: true,
      })
    );
 
  }

  render() {
    return html`
      <div class="search-container">
        <input
          @input="${this.handleInputChange}"
          type="text"
          placeholder="Search projects by name..."
        />
      </div>
    `;
  }
}