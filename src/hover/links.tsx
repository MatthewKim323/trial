"use client"

/**
 * Two CSS-only hovers.
 *
 * ArrowLink: the text glides right and an arrow slides into the gap it
 * leaves, on a long, soft ease-out.
 *
 * SplitButton: a quiet uppercase text button whose underline splits in the
 * middle and slides off both ends on hover.
 */
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react"

type ArrowProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  large?: boolean
  /** the glyph that slides in; any short string or inline svg */
  arrow?: ReactNode
  children: ReactNode
}

export function ArrowLink({ large, arrow = "→ ", children, className, ...rest }: ArrowProps) {
  return (
    <a className={`hk-arrow${large ? " hk-arrow--large" : ""}${className ? " " + className : ""}`} {...rest}>
      <span>
        <span aria-hidden="true">
          <span>{arrow}</span>
        </span>
        {children}
      </span>
    </a>
  )
}

type SplitProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }

export function SplitButton({ children, className, ...rest }: SplitProps) {
  return (
    <button type="button" className={`hk-split${className ? " " + className : ""}`} {...rest}>
      {children}
      <span className="hk-split__line" aria-hidden="true" />
      <span className="hk-split__line" aria-hidden="true" />
    </button>
  )
}
