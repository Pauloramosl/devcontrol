import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * DottedSurface — Animated 3D particle wave background.
 * Adapted for Vite + React (JSX) from the original Next.js/TS version.
 * Uses the dark-mode palette from the DevControl design system.
 */
export default function DottedSurface({ className = '', ...props }) {
  const containerRef = useRef(null)
  const animationIdRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const SEPARATION = 150
    const AMOUNTX = 40
    const AMOUNTY = 60

    // Scene setup
    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x0a0e1a, 2000, 10000)

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      10000
    )
    camera.position.set(0, 355, 1220)

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)

    container.appendChild(renderer.domElement)

    // Create particles
    const positions = []
    const colors = []
    const geometry = new THREE.BufferGeometry()

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2
        const y = 0
        const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2

        positions.push(x, y, z)
        // Dark theme — soft light dots
        colors.push(200, 200, 200)
      }
    }

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    )
    geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3)
    )

    // Material
    const material = new THREE.PointsMaterial({
      size: 8,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    })

    // Points mesh
    const points = new THREE.Points(geometry, material)
    scene.add(points)

    let count = 0
    let disposed = false

    // Animation loop
    const animate = () => {
      if (disposed) return

      const positionAttribute = geometry.attributes.position
      const posArray = positionAttribute.array

      let i = 0
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          const index = i * 3
          posArray[index + 1] =
            Math.sin((ix + count) * 0.3) * 50 +
            Math.sin((iy + count) * 0.5) * 50
          i++
        }
      }

      positionAttribute.needsUpdate = true
      renderer.render(scene, camera)
      count += 0.1

      animationIdRef.current = requestAnimationFrame(animate)
    }

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('resize', handleResize)

    // Start animation
    animationIdRef.current = requestAnimationFrame(animate)

    // Cleanup
    return () => {
      disposed = true
      window.removeEventListener('resize', handleResize)

      if (animationIdRef.current != null) {
        cancelAnimationFrame(animationIdRef.current)
        animationIdRef.current = null
      }

      scene.traverse((object) => {
        if (object instanceof THREE.Points) {
          object.geometry.dispose()
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose())
          } else {
            object.material.dispose()
          }
        }
      })

      renderer.dispose()

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none fixed inset-0 -z-[1] ${className}`}
      {...props}
    />
  )
}
