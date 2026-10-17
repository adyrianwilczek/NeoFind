!macro customInstall
  WriteRegStr HKCU "Software\\Clients\\StartMenuInternet\\NeoFind Browser" "" "NeoFind Browser"
  WriteRegStr HKCU "Software\\Clients\\StartMenuInternet\\NeoFind Browser\\Capabilities" "ApplicationName" "NeoFind Browser"
  WriteRegStr HKCU "Software\\Clients\\StartMenuInternet\\NeoFind Browser\\Capabilities" "ApplicationDescription" "NeoFind Browser by NeoFind"
  WriteRegStr HKCU "Software\\Clients\\StartMenuInternet\\NeoFind Browser\\Capabilities" "ApplicationIcon" "$INSTDIR\\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCU "Software\\Clients\\StartMenuInternet\\NeoFind Browser\\Capabilities\\URLAssociations" "http" "NeoFindURL"
  WriteRegStr HKCU "Software\\Clients\\StartMenuInternet\\NeoFind Browser\\Capabilities\\URLAssociations" "https" "NeoFindURL"
  WriteRegStr HKCU "Software\\Clients\\StartMenuInternet\\NeoFind Browser\\shell\\open\\command" "" '"$INSTDIR\\${APP_EXECUTABLE_FILENAME}"'
  WriteRegStr HKCU "Software\\Classes\\NeoFindURL" "" "NeoFind Browser URL"
  WriteRegStr HKCU "Software\\Classes\\NeoFindURL" "URL Protocol" ""
  WriteRegStr HKCU "Software\\Classes\\NeoFindURL\\DefaultIcon" "" "$INSTDIR\\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCU "Software\\Classes\\NeoFindURL\\shell\\open\\command" "" '"$INSTDIR\\${APP_EXECUTABLE_FILENAME}" "%1"'
  WriteRegStr HKCU "Software\\RegisteredApplications" "NeoFind Browser" "Software\\Clients\\StartMenuInternet\\NeoFind Browser\\Capabilities"
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\\Clients\\StartMenuInternet\\NeoFind Browser"
  DeleteRegKey HKCU "Software\\Classes\\NeoFindURL"
  DeleteRegValue HKCU "Software\\RegisteredApplications" "NeoFind Browser"
!macroend
