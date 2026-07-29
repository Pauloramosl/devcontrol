import devControlLogo from '../../img/Logo DC.png'

function DevControlLogo({ className = '', imageClassName = '', alt = 'DevControl' }) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      <img
        src={devControlLogo}
        alt={alt}
        className={`h-full w-full object-contain mix-blend-screen ${imageClassName}`}
      />
    </span>
  )
}

export default DevControlLogo
